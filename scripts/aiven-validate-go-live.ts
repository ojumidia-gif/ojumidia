import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import { mysqlConnectionFromUrl } from "../server/mysqlConnection";

const files = ["0048_coverage_offer_declines", "0049_professional_network", "0050_network_opportunities", "0051_network_productions", "0052_network_operations", "0053_network_payments_directory"] as const;

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL ausente.");
  const { uri, ssl } = mysqlConnectionFromUrl(raw);
  const conn = await mysql.createConnection({ uri, ssl });
  try {
    await conn.query("START TRANSACTION READ ONLY");
    const [migrations] = await conn.query("SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY id") as [Array<{ id: number; hash: string; created_at: number }>, unknown];
    const hashes = Object.fromEntries(files.map(tag => {
      const body = readFileSync(resolve("drizzle", `${tag}.sql`));
      return [tag, createHash("sha256").update(body).digest("hex")];
    }));
    const present = (await conn.query("SELECT TABLE_NAME AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()") as [Array<{ n: string }>, unknown])[0].map(r => r.n);
    const [joinCols] = await conn.query("SELECT COLUMN_NAME AS n, COLUMN_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'adminJoinRequests' ORDER BY ORDINAL_POSITION");
    const [execCols] = await conn.query("SELECT COLUMN_NAME AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'networkExecutors'");
    const [profileCols] = await conn.query("SELECT COLUMN_NAME AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'professionalProfiles'");
    const [indexes] = await conn.query("SELECT TABLE_NAME AS t, INDEX_NAME AS i, NON_UNIQUE AS u, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('coverageOfferDeclines','professionalProfiles','professionalProfileSpecialties','mediaOutlets','networkExecutors','adminJoinRequests','networkOpportunities','networkOpportunityInvites','networkOpportunitySpecialties','networkProductions','networkProductionMedia','networkNotifications','networkNotificationPreferences','networkProductionSettlements','networkProductionDeliveries','networkPaymentIntents','networkPaymentWebhookReceipts') GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE ORDER BY TABLE_NAME, INDEX_NAME");
    const [counts] = await conn.query("SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM partners) partners, (SELECT COUNT(*) FROM commercialPolicies) commercialPolicies, (SELECT COUNT(*) FROM auditEvents) auditEvents, (SELECT COUNT(*) FROM mediaAssets) mediaAssets, (SELECT COUNT(*) FROM publications) publications");
    const first48 = migrations.slice(0, 48).map(m => m.hash);
    await conn.query("COMMIT");
    console.log(JSON.stringify({
      migrationCount: migrations.length,
      lastId: migrations.at(-1)?.id,
      lastHash: migrations.at(-1)?.hash,
      lastCreatedAt: migrations.at(-1)?.created_at,
      fileHashes: hashes,
      hashesInDb: Object.fromEntries(files.map(tag => [tag, migrations.some(m => m.hash === hashes[tag])])),
      first48Unchanged: first48.length === 48 && first48[47] === "9358a36affed94e2c2eedf104ade3153db8dbc7c2feeb6de72e04de2b237354d",
      tables: {
        coverageOfferDeclines: present.includes("coverageOfferDeclines"),
        professionalProfiles: present.includes("professionalProfiles"),
        professionalProfileSpecialties: present.includes("professionalProfileSpecialties"),
        mediaOutlets: present.includes("mediaOutlets"),
        networkOpportunities: present.includes("networkOpportunities"),
        networkOpportunityInvites: present.includes("networkOpportunityInvites"),
        networkOpportunitySpecialties: present.includes("networkOpportunitySpecialties"),
        networkProductions: present.includes("networkProductions"),
        networkProductionMedia: present.includes("networkProductionMedia"),
        networkNotifications: present.includes("networkNotifications"),
        networkNotificationPreferences: present.includes("networkNotificationPreferences"),
        networkProductionSettlements: present.includes("networkProductionSettlements"),
        networkProductionDeliveries: present.includes("networkProductionDeliveries"),
        networkPaymentIntents: present.includes("networkPaymentIntents"),
        networkPaymentWebhookReceipts: present.includes("networkPaymentWebhookReceipts"),
      },
      joinCols,
      execHasProfileId: Array.isArray(execCols) && execCols.some((c: { n: string }) => c.n === "professionalProfileId"),
      profileCols,
      indexes,
      counts,
    }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
