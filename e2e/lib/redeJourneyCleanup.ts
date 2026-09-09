import { and, eq } from "drizzle-orm";
import {
  adminJoinRequests,
  administratorResponsibilityTerms,
  auditEvents,
  collaboratorAccessGrants,
  coverageOfferDeclines,
  mediaOutlets,
  networkExecutors,
  networkNotificationPreferences,
  networkNotifications,
  partnerMembers,
  partnerTerritories,
  partners,
  professionalProfileSpecialties,
  professionalProfiles,
  taxonomies,
  termsOfUseAcceptances,
  uploadSessions,
  users,
} from "../../drizzle/schema";
import { registerOriginationCleanup } from "./originationCleanup";
import { requireQaDb } from "./qaDb";
import { TestLedger } from "./testLedger";

export function registerRedeJourneyCleanup(ledger: TestLedger) {
  registerOriginationCleanup(ledger);

  ledger.setCleanupHandler("notification", async entry => {
    ledger.assertOwned("notification", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "network-notification"), eq(auditEvents.resourceId, id)));
    await db.delete(networkNotifications).where(eq(networkNotifications.id, id));
    const leftover = await db.select({ id: networkNotifications.id }).from(networkNotifications).where(eq(networkNotifications.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "notificação ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("auditEvent", async entry => {
    ledger.assertOwned("auditEvent", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.delete(auditEvents).where(eq(auditEvents.id, id));
    const leftover = await db.select({ id: auditEvents.id }).from(auditEvents).where(eq(auditEvents.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "auditoria ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("collaboratorGrant", async entry => {
    ledger.assertOwned("collaboratorGrant", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.delete(administratorResponsibilityTerms).where(eq(administratorResponsibilityTerms.grantId, id));
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "collaborator-grant"), eq(auditEvents.resourceId, id)));
    await db.delete(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, id));
    const leftover = await db.select({ id: collaboratorAccessGrants.id }).from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "grant ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("partner", async entry => {
    ledger.assertOwned("partner", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.delete(partnerMembers).where(eq(partnerMembers.partnerId, id));
    await db.delete(partnerTerritories).where(eq(partnerTerritories.partnerId, id));
    await db.delete(partners).where(eq(partners.id, id));
    const leftover = await db.select({ id: partners.id }).from(partners).where(eq(partners.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "parceiro ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("professionalProfile", async entry => {
    ledger.assertOwned("professionalProfile", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.update(networkExecutors).set({ professionalProfileId: null }).where(eq(networkExecutors.professionalProfileId, id));
    await db.delete(professionalProfileSpecialties).where(eq(professionalProfileSpecialties.profileId, id));
    await db.delete(mediaOutlets).where(eq(mediaOutlets.profileId, id));
    await db.delete(professionalProfiles).where(eq(professionalProfiles.id, id));
    const leftover = await db.select({ id: professionalProfiles.id }).from(professionalProfiles).where(eq(professionalProfiles.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "perfil ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("joinRequest", async entry => {
    ledger.assertOwned("joinRequest", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    const join = (await db.select({ email: adminJoinRequests.email }).from(adminJoinRequests).where(eq(adminJoinRequests.id, id)).limit(1))[0];
    if (join?.email) {
      const terms = await db.select({ id: termsOfUseAcceptances.id }).from(termsOfUseAcceptances).where(eq(termsOfUseAcceptances.email, join.email));
      for (const term of terms) {
        await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "terms-of-use"), eq(auditEvents.resourceId, term.id)));
      }
      await db.delete(termsOfUseAcceptances).where(eq(termsOfUseAcceptances.email, join.email));
    }
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "join-request"), eq(auditEvents.resourceId, id)));
    await db.delete(adminJoinRequests).where(eq(adminJoinRequests.id, id));
    const leftover = await db.select({ id: adminJoinRequests.id }).from(adminJoinRequests).where(eq(adminJoinRequests.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "candidatura ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("user", async entry => {
    ledger.assertOwned("user", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    const row = (await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).limit(1))[0];
    if (!row) return { gone: true };
    if (row.role === "administrador principal") {
      return { gone: false, detail: "recusa apagar Super Admin QA" };
    }
    await db.delete(termsOfUseAcceptances).where(eq(termsOfUseAcceptances.userId, id));
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "terms-of-use"), eq(auditEvents.actorId, id)));
    await db.delete(networkNotificationPreferences).where(eq(networkNotificationPreferences.userId, id));
    const recipientNotifs = await db.select({ id: networkNotifications.id }).from(networkNotifications).where(eq(networkNotifications.recipientUserId, id));
    for (const notif of recipientNotifs) {
      await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "network-notification"), eq(auditEvents.resourceId, notif.id)));
    }
    await db.delete(networkNotifications).where(eq(networkNotifications.recipientUserId, id));
    await db.delete(partnerMembers).where(eq(partnerMembers.userId, id));
    await db.delete(coverageOfferDeclines).where(eq(coverageOfferDeclines.userId, id));
    await db.delete(uploadSessions).where(eq(uploadSessions.userId, id));
    await db.update(networkExecutors).set({ linkedUserId: null }).where(eq(networkExecutors.linkedUserId, id));
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "auth"), eq(auditEvents.resourceId, id)));
    await db.delete(auditEvents).where(eq(auditEvents.actorId, id));
    await db.update(collaboratorAccessGrants).set({ userId: null }).where(eq(collaboratorAccessGrants.userId, id));
    await db.update(professionalProfiles).set({ userId: null }).where(eq(professionalProfiles.userId, id));
    await db.delete(users).where(eq(users.id, id));
    const leftover = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "usuário ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("taxonomy", async entry => {
    ledger.assertOwned("taxonomy", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    const linked = await db.select({ id: partnerTerritories.id }).from(partnerTerritories).where(eq(partnerTerritories.territoryId, id)).limit(1);
    if (linked.length) return { gone: false, detail: "território ainda vinculado a parceiro" };
    await db.delete(taxonomies).where(eq(taxonomies.id, id));
    const leftover = await db.select({ id: taxonomies.id }).from(taxonomies).where(eq(taxonomies.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "território ainda existe" } : { gone: true };
  });
}

/** Apaga só o user OAuth do e-mail do participante QA (nunca Super Admin). Usado para ghost de run interrompido. */
export async function purgeQaParticipantUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: true as const, purged: false as const };
  const db = await requireQaDb();
  const row = (await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, normalized)).limit(1))[0];
  if (!row) return { ok: true as const, purged: false as const };
  if (row.role === "administrador principal") {
    return { ok: false as const, purged: false as const, reason: "recusa apagar Super Admin QA" };
  }
  const ledger = new TestLedger();
  registerRedeJourneyCleanup(ledger);
  ledger.add("user", row.id);
  const cleanup = await ledger.runCleanup();
  if (!cleanup.ok) return { ok: false as const, purged: false as const, reason: cleanup.reason };
  return { ok: true as const, purged: true as const };
}
