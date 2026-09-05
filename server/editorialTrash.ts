import { and, eq, isNotNull, lte, or } from "drizzle-orm";
import {
  editorialActivities,
  highlightSuggestions,
  publicationMedia,
  publicationRelations,
  publicationTaxonomies,
  publications,
} from "../drizzle/schema";
import { getDb } from "./db";
import { recordAuditEvent } from "./partnerScope";

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
   * O expurgo editorial remove o conteúdo da publicação e os vínculos.
   * A mídia do Acervo não é destruída aqui: Lixeira de mídia →
   * Excluir definitivamente (media.purge) é a única destruição física.
   */
  await db
    .delete(publicationMedia)
    .where(eq(publicationMedia.publicationId, publication.id));

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
