import { eq } from "drizzle-orm";
import { communityCareRequests, revenueLeadActivities, revenueLeads } from "../../drizzle/schema";
import { requireQaDb } from "./qaDb";
import type { TestLedger } from "./testLedger";

export function registerPublicMutationCleanup(ledger: TestLedger) {
  ledger.setCleanupHandler("careRequest", async entry => {
    ledger.assertOwned("careRequest", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.delete(communityCareRequests).where(eq(communityCareRequests.id, id));
    const leftover = await db.select({ id: communityCareRequests.id }).from(communityCareRequests).where(eq(communityCareRequests.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "pedido de acolhimento ainda existe" } : { gone: true };
  });

  ledger.setCleanupHandler("revenueLead", async entry => {
    ledger.assertOwned("revenueLead", entry.id);
    const id = Number(entry.id);
    const db = await requireQaDb();
    await db.delete(revenueLeadActivities).where(eq(revenueLeadActivities.leadId, id));
    await db.delete(revenueLeads).where(eq(revenueLeads.id, id));
    const leftover = await db.select({ id: revenueLeads.id }).from(revenueLeads).where(eq(revenueLeads.id, id)).limit(1);
    return leftover.length ? { gone: false, detail: "lead de receita ainda existe" } : { gone: true };
  });
}
