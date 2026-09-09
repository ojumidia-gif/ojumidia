import { and, eq } from "drizzle-orm";
import { auditEvents, networkVoices } from "../../drizzle/schema";
import { requireQaDb } from "./qaDb";
import type { TestLedger } from "./testLedger";

export function registerNetworkVoicesCleanup(ledger: TestLedger) {
  ledger.setCleanupHandler("networkVoice", async entry => {
    ledger.assertOwned("networkVoice", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.delete(auditEvents).where(and(eq(auditEvents.resourceType, "network-voice"), eq(auditEvents.resourceId, id)));
    await db.delete(networkVoices).where(eq(networkVoices.id, id));
    const leftover = await db.select({ id: networkVoices.id }).from(networkVoices).where(eq(networkVoices.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "depoimento ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("auditEvent", async entry => {
    ledger.assertOwned("auditEvent", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.delete(auditEvents).where(eq(auditEvents.id, id));
    const leftover = await db.select({ id: auditEvents.id }).from(auditEvents).where(eq(auditEvents.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "auditEvent ainda existe" } : { gone: true };
  });
}
