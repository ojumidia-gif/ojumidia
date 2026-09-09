import { and, eq } from "drizzle-orm";
import {
  auditEvents,
  commercialActivities,
  commercialRequests,
  coverageOfferDeclines,
  networkNotifications,
  networkOpportunities,
  networkProductions,
} from "../../drizzle/schema";
import { requireQaDb } from "./qaDb";
import type { TestLedger } from "./testLedger";

export function registerOriginationCleanup(ledger: TestLedger) {
  ledger.setCleanupHandler("commercialRequest", async entry => {
    ledger.assertOwned("commercialRequest", entry.id);
    const id = Number(entry.id);
    if (!Number.isInteger(id) || id <= 0) return { gone: false, detail: "id inválido" };
    const db = await requireQaDb();
    const opportunities = await db.select({ id: networkOpportunities.id }).from(networkOpportunities).where(eq(networkOpportunities.commercialRequestId, id));
    const productions = await db.select({ id: networkProductions.id }).from(networkProductions).where(eq(networkProductions.commercialRequestId, id));
    if (opportunities.length || productions.length) {
      return { gone: false, detail: "recusa apagar: há Opportunity/Production vinculadas; não é originação isolada." };
    }
    await db.delete(networkNotifications).where(and(eq(networkNotifications.referenceType, "commercial-request"), eq(networkNotifications.referenceId, id)));
    await db.delete(commercialActivities).where(eq(commercialActivities.requestId, id));
    await db.delete(coverageOfferDeclines).where(eq(coverageOfferDeclines.requestId, id));
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "commercial-request"), eq(auditEvents.resourceId, id)));
    await db.delete(commercialRequests).where(eq(commercialRequests.id, id));
    const leftover = await db.select({ id: commercialRequests.id }).from(commercialRequests).where(eq(commercialRequests.id, id)).limit(1);
    if (leftover.length) return { gone: false, detail: "registro ainda existe após DELETE por id" };
    return { gone: true };
  });
}
