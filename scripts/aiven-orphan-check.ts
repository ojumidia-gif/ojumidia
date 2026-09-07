import "dotenv/config";
import mysql from "mysql2/promise";
import { mysqlConnectionFromUrl } from "../server/mysqlConnection";

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL ausente.");
  const { uri, ssl } = mysqlConnectionFromUrl(raw);
  const conn = await mysql.createConnection({ uri, ssl });
  try {
    await conn.query("START TRANSACTION READ ONLY");
    const [rows] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM coverageOfferDeclines) coverageOfferDeclines,
        (SELECT COUNT(*) FROM professionalProfiles) professionalProfiles,
        (SELECT COUNT(*) FROM professionalProfileSpecialties) professionalProfileSpecialties,
        (SELECT COUNT(*) FROM mediaOutlets) mediaOutlets,
        (SELECT COUNT(*) FROM networkOpportunities) networkOpportunities,
        (SELECT COUNT(*) FROM networkOpportunityInvites) networkOpportunityInvites,
        (SELECT COUNT(*) FROM networkProductions) networkProductions,
        (SELECT COUNT(*) FROM networkProductionMedia) networkProductionMedia,
        (SELECT COUNT(*) FROM networkNotifications) networkNotifications,
        (SELECT COUNT(*) FROM networkProductionSettlements) networkProductionSettlements,
        (SELECT COUNT(*) FROM networkPaymentIntents) networkPaymentIntents,
        (SELECT COUNT(*) FROM networkPaymentWebhookReceipts) networkPaymentWebhookReceipts,
        (SELECT COUNT(*) FROM professionalProfiles WHERE userId IS NOT NULL AND userId NOT IN (SELECT id FROM users)) profilesUserOrphans,
        (SELECT COUNT(*) FROM networkOpportunityInvites i LEFT JOIN professionalProfiles p ON p.id = i.professionalProfileId WHERE p.id IS NULL) inviteOrphans,
        (SELECT COUNT(*) FROM networkProductions pr LEFT JOIN networkOpportunities o ON o.id = pr.opportunityId WHERE o.id IS NULL) productionOrphans
    `);
    await conn.query("COMMIT");
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
