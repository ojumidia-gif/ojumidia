import { and, eq, isNotNull, lte, or } from "drizzle-orm";
import {
  editorialActivities,
  highlightSuggestions,
  mediaAssets,
  publicationMedia,
  publicationRelations,
  publicationTaxonomies,
  publications,
} from "../drizzle/schema";
import { getDb } from "./db";
import { recordAuditEvent } from "./partnerScope";
import { storageDelete } from "./storage";

export const EDITORIAL_TRASH_RETENTION_MS = 24 * 60 * 60 * 1000;

export function editorialTrashDeadline(deletedAt: Date) {
  return new Date(deletedAt.getTime() + EDITORIAL_TRASH_RETENTION_MS);
}

export function isEditorialTrashExpired(deletedAt: Date, now = new Date()) {
  return now.getTime() >= editorialTrashDeadline(deletedAt).getTime();
}

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Publication = typeof publications.$inferSelect;

export async function permanentlyPurgePublication(
  db: Database,
  publication: Publication,
  actorId: number,
  detail: string,
) {
  await recordAuditEvent(db, {
    actorId,
    partnerId: publication.partnerId,
    territoryId: null,
    resourceType: "publication",
    resourceId: publication.id,
    action: "publication-permanently-purged",
    previousState: {
      status: publication.status,
      deletedAt: publication.deletedAt?.toISOString() ?? null,
      version: publication.version,
    },
    detail,
  });

  /*
   * Antes de remover os vínculos, descobrimos quais mídias pertencem
   * exclusivamente a esta publicação.
   */
  const linkedMedia = await db
    .select({
      mediaId: publicationMedia.mediaId,
      storageKey: mediaAssets.storageKey,
    })
    .from(publicationMedia)
    .leftJoin(
      mediaAssets,
      eq(publicationMedia.mediaId, mediaAssets.id),
    )
    .where(eq(publicationMedia.publicationId, publication.id));

  /*
   * Remove o vínculo da publicação primeiro.
   */
  await db
    .delete(publicationMedia)
    .where(eq(publicationMedia.publicationId, publication.id));

  /*
   * Uma mídia pode eventualmente estar vinculada a outra publicação.
   * Só podemos apagar o arquivo físico quando não existir mais nenhum
   * vínculo com outra publicação.
   */
  for (const media of linkedMedia) {
    if (!media.storageKey) {
      continue;
    }

    const remainingReferences = await db
      .select({ id: publicationMedia.id })
      .from(publicationMedia)
      .where(eq(publicationMedia.mediaId, media.mediaId))
      .limit(1);

    if (remainingReferences.length > 0) {
      continue;
    }

    /*
     * Apaga primeiro o objeto físico do Storage.
     *
     * Se a exclusão física falhar, interrompemos o expurgo para evitar
     * que o banco diga que a mídia foi definitivamente eliminada
     * enquanto o arquivo continua ocupando espaço no Storage.
     */
    await storageDelete(media.storageKey);

    await db
      .delete(mediaAssets)
      .where(eq(mediaAssets.id, media.mediaId));
  }

  await db
    .delete(publicationTaxonomies)
    .where(eq(publicationTaxonomies.publicationId, publication.id));

  await db
    .delete(publicationRelations)
    .where(
      or(
        eq(publicationRelations.sourcePublicationId, publication.id),
        eq(publicationRelations.relatedPublicationId, publication.id),
      ),
    );

  await db
    .delete(highlightSuggestions)
    .where(eq(highlightSuggestions.publicationId, publication.id));

  await db
    .delete(publications)
    .where(eq(publications.id, publication.id));
}

export async function purgeExpiredEditorialTrash(
  db: Database,
  actorId = -1,
  now = new Date(),
) {
  const cutoff = new Date(
    now.getTime() - EDITORIAL_TRASH_RETENTION_MS,
  );

  const expired = await db
    .select()
    .from(publications)
    .where(
      and(
        isNotNull(publications.deletedAt),
        lte(publications.deletedAt, cutoff),
      ),
    );

  for (const publication of expired) {
    await permanentlyPurgePublication(
      db,
      publication,
      actorId,
      "Expurgo automático após 24 horas na Lixeira Editorial.",
    );

    await db.insert(editorialActivities).values({
      publicationId: publication.id,
      actorId,
      fromStatus: "Arquivada",
      toStatus: "Arquivada",
      note: "Expurgo automático da Lixeira Editorial após o prazo de retenção.",
    });
  }

  return {
    purgedPublicationIds: expired.map((item) => item.id),
  };
}