import { and, eq, isNull, lte, ne, or } from "drizzle-orm";
import { commercialEditorialAuthorizations, editorialActivities, publications } from "../drizzle/schema";
import { canUseOnPortal } from "./commercialEditorialAuthorization";
import { publishEditorialEvent } from "./editorialEvents";
import { recordAuditEvent } from "./partnerScope";

type Db = NonNullable<Awaited<ReturnType<typeof import("./db").getDb>>>;

export async function applyDueScheduledPublications(db: Db, now = new Date()) {
  const due = await db.select().from(publications).where(and(
    eq(publications.status, "Aprovada"),
    isNull(publications.deletedAt),
    isNull(publications.quarantinedAt),
    lte(publications.scheduledAt, now),
  ));
  let published = 0;
  let skipped = 0;
  for (const publication of due) {
    if (publication.commercialRequestId) {
      const authorization = (await db.select().from(commercialEditorialAuthorizations).where(eq(commercialEditorialAuthorizations.requestId, publication.commercialRequestId)).limit(1))[0];
      if (!canUseOnPortal(authorization)) {
        skipped += 1;
        continue;
      }
    }
    const changed = await db.update(publications).set({
      status: "Publicada",
      publishedAt: now,
      isPublic: true,
      unpublishedAt: null,
      unpublishedBy: null,
      scheduledAt: null,
      version: publication.version + 1,
    }).where(and(eq(publications.id, publication.id), eq(publications.status, "Aprovada"), eq(publications.version, publication.version)));
    if (!changed[0]?.affectedRows) continue;
    await db.insert(editorialActivities).values({
      publicationId: publication.id,
      actorId: publication.approvedBy || publication.createdBy,
      fromStatus: "Aprovada",
      toStatus: "Publicada",
      note: "Publicação automática na data programada.",
    });
    await recordAuditEvent(db, {
      actorId: null,
      partnerId: publication.partnerId,
      resourceType: "publication",
      resourceId: publication.id,
      action: "publication-scheduled-published",
      previousState: { status: "Aprovada" },
      nextState: { status: "Publicada" },
      detail: "Automação publicou conteúdo já aprovado na data programada. Permissões não foram alteradas.",
    });
    publishEditorialEvent("status-changed", publication.id);
    published += 1;
  }
  return { published, skipped };
}

export async function expireDueHomeHighlights(db: Db, now = new Date()) {
  const due = await db.select().from(publications).where(and(
    isNull(publications.deletedAt),
    lte(publications.highlightExpiresAt, now),
    or(ne(publications.homePlacement, "Nenhum"), eq(publications.manualFeatured, true)),
  ));
  let expired = 0;
  for (const publication of due) {
    const changed = await db.update(publications).set({
      homePlacement: "Nenhum",
      manualFeatured: false,
      highlightExpiresAt: null,
      version: publication.version + 1,
    }).where(and(eq(publications.id, publication.id), eq(publications.version, publication.version)));
    if (!changed[0]?.affectedRows) continue;
    await recordAuditEvent(db, {
      actorId: null,
      partnerId: publication.partnerId,
      resourceType: "publication",
      resourceId: publication.id,
      action: "highlight-expired",
      previousState: { homePlacement: publication.homePlacement, manualFeatured: publication.manualFeatured },
      nextState: { homePlacement: "Nenhum", manualFeatured: false },
      detail: "Automação retirou o destaque expirado da Home sem alterar o status editorial.",
    });
    publishEditorialEvent("curation-updated", publication.id);
    expired += 1;
  }
  return { expired };
}

export async function runEditorialScheduleJobs(db: Db, now = new Date()) {
  const scheduled = await applyDueScheduledPublications(db, now);
  const highlights = await expireDueHomeHighlights(db, now);
  return { ...scheduled, ...highlights };
}
