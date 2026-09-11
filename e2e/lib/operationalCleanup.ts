import { and, eq, like } from "drizzle-orm";
import {
  auditEvents,
  commercialPolicies,
  editorialActivities,
  mediaAssets,
  networkNotifications,
  networkOpportunities,
  networkOpportunityInvites,
  networkOpportunitySpecialties,
  networkProductionMedia,
  networkProductions,
  portalContentActivities,
  portalContentBlocks,
  publicationMedia,
  publicationTaxonomies,
  publications,
  uploadSessions,
} from "../../drizzle/schema";
import { registerRedeJourneyCleanup } from "./redeJourneyCleanup";
import { requireQaDb } from "./qaDb";
import type { TestLedger } from "./testLedger";

export function registerOperationalCleanup(ledger: TestLedger) {
  registerRedeJourneyCleanup(ledger);

  ledger.setCleanupHandler("mediaAsset", async entry => {
    ledger.assertOwned("mediaAsset", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    const asset = (await db.select({ uploadId: mediaAssets.uploadId }).from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1))[0];
    await db.delete(publicationMedia).where(eq(publicationMedia.mediaId, id));
    await db.delete(networkProductionMedia).where(eq(networkProductionMedia.mediaId, id));
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "media"), eq(auditEvents.resourceId, id)));
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    if (asset?.uploadId) {
      await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "upload-session"), eq(auditEvents.action, "upload-ready"), like(auditEvents.nextState, `%${asset.uploadId}%`)));
      await db.delete(uploadSessions).where(eq(uploadSessions.id, asset.uploadId));
    }
    const leftover = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "mídia ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("production", async entry => {
    ledger.assertOwned("production", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    const links = await db.select({ mediaId: networkProductionMedia.mediaId }).from(networkProductionMedia).where(eq(networkProductionMedia.productionId, id));
    await db.delete(networkProductionMedia).where(eq(networkProductionMedia.productionId, id));
    for (const link of links) {
      await db.delete(publicationMedia).where(eq(publicationMedia.mediaId, link.mediaId));
      await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "media"), eq(auditEvents.resourceId, link.mediaId)));
      const asset = (await db.select({ uploadId: mediaAssets.uploadId, origin: mediaAssets.origin, publicationAllowed: mediaAssets.publicationAllowed }).from(mediaAssets).where(eq(mediaAssets.id, link.mediaId)).limit(1))[0];
      if (asset && asset.publicationAllowed === false) {
        if (asset.uploadId) {
          await db.delete(uploadSessions).where(eq(uploadSessions.id, asset.uploadId));
        }
        await db.delete(mediaAssets).where(eq(mediaAssets.id, link.mediaId));
      }
    }
    const notifs = await db.select({ id: networkNotifications.id }).from(networkNotifications).where(and(eq(networkNotifications.referenceType, "network-production"), eq(networkNotifications.referenceId, id)));
    for (const notif of notifs) {
      await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "network-notification"), eq(auditEvents.resourceId, notif.id)));
    }
    await db.delete(networkNotifications).where(and(eq(networkNotifications.referenceType, "network-production"), eq(networkNotifications.referenceId, id)));
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "network-production"), eq(auditEvents.resourceId, id)));
    await db.delete(networkProductions).where(eq(networkProductions.id, id));
    const leftover = await db.select({ id: networkProductions.id }).from(networkProductions).where(eq(networkProductions.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "produção ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("opportunity", async entry => {
    ledger.assertOwned("opportunity", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    const productions = await db.select({ id: networkProductions.id }).from(networkProductions).where(eq(networkProductions.opportunityId, id));
    if (productions.length) return { gone: false, detail: "produção ainda ligada à oportunidade" };
    await db.delete(networkOpportunityInvites).where(eq(networkOpportunityInvites.opportunityId, id));
    await db.delete(networkOpportunitySpecialties).where(eq(networkOpportunitySpecialties.opportunityId, id));
    const notifs = await db.select({ id: networkNotifications.id }).from(networkNotifications).where(and(eq(networkNotifications.referenceType, "network-opportunity"), eq(networkNotifications.referenceId, id)));
    for (const notif of notifs) {
      await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "network-notification"), eq(auditEvents.resourceId, notif.id)));
    }
    await db.delete(networkNotifications).where(and(eq(networkNotifications.referenceType, "network-opportunity"), eq(networkNotifications.referenceId, id)));
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "network-opportunity"), eq(auditEvents.resourceId, id)));
    await db.delete(networkOpportunities).where(eq(networkOpportunities.id, id));
    const leftover = await db.select({ id: networkOpportunities.id }).from(networkOpportunities).where(eq(networkOpportunities.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "oportunidade ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("publication", async entry => {
    ledger.assertOwned("publication", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.delete(publicationMedia).where(eq(publicationMedia.publicationId, id));
    await db.delete(publicationTaxonomies).where(eq(publicationTaxonomies.publicationId, id));
    await db.delete(editorialActivities).where(eq(editorialActivities.publicationId, id));
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "publication"), eq(auditEvents.resourceId, id)));
    await db.delete(publications).where(eq(publications.id, id));
    const leftover = await db.select({ id: publications.id }).from(publications).where(eq(publications.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "publicação ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("commercialPolicy", async entry => {
    ledger.assertOwned("commercialPolicy", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "commercial-policy"), eq(auditEvents.resourceId, id)));
    await db.delete(commercialPolicies).where(eq(commercialPolicies.id, id));
    const leftover = await db.select({ id: commercialPolicies.id }).from(commercialPolicies).where(eq(commercialPolicies.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "política ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("other", async entry => {
    ledger.assertOwned("other", entry.id);
    const raw = String(entry.id);
    if (raw.startsWith("upload-session:")) {
      const uploadId = raw.slice("upload-session:".length);
      if (uploadId.length < 8 || uploadId.length > 96) return { gone: false, detail: "upload-session inválida" };
      const db = await requireQaDb();
      await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "upload-session"), like(auditEvents.nextState, `%${uploadId}%`)));
      await db.delete(uploadSessions).where(eq(uploadSessions.id, uploadId));
      const leftover = await db.select({ id: uploadSessions.id }).from(uploadSessions).where(eq(uploadSessions.id, uploadId)).limit(1);
      return leftover.length ? { gone: false, detail: "sessão de upload ainda existe" } : { gone: true };
    }
    if (!raw.startsWith("portal-block:")) return { gone: true };
    const id = Number(raw.slice("portal-block:".length));
    if (!Number.isInteger(id) || id <= 0) return { gone: false, detail: "bloco institucional inválido" };
    const db = await requireQaDb();
    await db.delete(portalContentActivities).where(eq(portalContentActivities.blockId, id));
    await db.delete(portalContentBlocks).where(eq(portalContentBlocks.id, id));
    const leftover = await db.select({ id: portalContentBlocks.id }).from(portalContentBlocks).where(eq(portalContentBlocks.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "bloco institucional ainda existe" } : { gone: true };
  });
}
