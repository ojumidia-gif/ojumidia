import { and, eq, isNotNull, lte, or } from "drizzle-orm";
import {
  advertisements,
  communityEvents,
  contracts,
  editorialActivities,
  highlightSuggestions,
  publicationMedia,
  publicationRelations,
  publicationTaxonomies,
  publications,
} from "../drizzle/schema";
import { getDb } from "./db";
import { recordAuditEvent } from "./partnerScope";
import { assertResourcePurgeAllowed, GovernanceHoldError } from "./governance";

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
  await assertResourcePurgeAllowed(db, "publication", publication.id);
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
    .delete(editorialActivities)
    .where(eq(editorialActivities.publicationId, publication.id));

  await db
    .update(contracts)
    .set({ publicationId: null })
    .where(eq(contracts.publicationId, publication.id));

  await db
    .update(communityEvents)
    .set({ publicationId: null })
    .where(eq(communityEvents.publicationId, publication.id));

  await db
    .update(advertisements)
    .set({ sourcePublicationId: null })
    .where(eq(advertisements.sourcePublicationId, publication.id));

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
    if (publication.quarantinedAt) continue;
    try {
      await permanentlyPurgePublication(
        db,
        publication,
        actorId,
        "Expurgo automático após 24 horas na Lixeira Editorial.",
      );
    } catch (error) {
      if (error instanceof GovernanceHoldError) continue;
      throw error;
    }
  }

  return {
    purgedPublicationIds: expired.map((item) => item.id),
  };
}
