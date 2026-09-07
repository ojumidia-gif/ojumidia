/**
 * Auditoria Aiven SOMENTE LEITURA.
 * Proibido: migration, DDL, INSERT, UPDATE, DELETE, db:migrate, push, deploy.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { mysqlConnectionFromUrl } from "../server/mysqlConnection";

const EXPECTED = [
  "coverageOfferDeclines",
  "professionalProfiles",
  "professionalProfileSpecialties",
  "mediaOutlets",
  "networkOpportunities",
  "networkOpportunitySpecialties",
  "networkOpportunityInvites",
  "networkProductions",
  "networkProductionMedia",
  "networkNotifications",
  "networkNotificationPreferences",
  "networkProductionSettlements",
  "networkProductionDeliveries",
  "networkPaymentIntents",
  "networkPaymentWebhookReceipts",
] as const;

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL ausente no ambiente local.");
  const { uri, ssl } = mysqlConnectionFromUrl(raw);
  const conn = await mysql.createConnection({ uri, ssl });
  try {
    await conn.query("SET SESSION TRANSACTION READ ONLY");
    await conn.query("START TRANSACTION READ ONLY");

    const [[identity]] = await conn.query(
      "SELECT DATABASE() AS dbName, @@hostname AS hostname, @@read_only AS globalReadOnly, @@transaction_read_only AS txReadOnly",
    ) as [Array<{ dbName: string; hostname: string; globalReadOnly: number; txReadOnly: number }>, unknown];

    const [migrations] = await conn.query(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at ASC, id ASC",
    );

    const [tables] = await conn.query(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME",
    ) as [Array<{ name: string }>, unknown];

    const tableNames = tables.map(row => row.name);
    const presence = Object.fromEntries(EXPECTED.map(name => [name, tableNames.includes(name)]));

    const [profileCols] = await conn.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'professionalProfiles' ORDER BY ORDINAL_POSITION",
    );
    const [joinCols] = await conn.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'adminJoinRequests' AND COLUMN_NAME IN ('practice','networkBond','hasOwnMedia','mediaOutletName','mediaOutletUrl') ORDER BY COLUMN_NAME",
    );
    const [executorCols] = await conn.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'networkExecutors' AND COLUMN_NAME IN ('professionalProfileId','publicSlug','publicVisible') ORDER BY COLUMN_NAME",
    );

    const countSql = EXPECTED.filter(name => tableNames.includes(name))
      .map(name => `(SELECT COUNT(*) FROM \`${name}\`) AS \`${name}\``)
      .join(", ");
    const [counts] = countSql
      ? await conn.query(`SELECT ${countSql}`)
      : [[{ note: "nenhuma tabela 0048–0053 presente" }]];

    const [orphanHints] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM mediaAssets) AS mediaAssets,
        (SELECT COUNT(*) FROM publications) AS publications,
        (SELECT COUNT(*) FROM partners) AS partners,
        (SELECT COUNT(*) FROM commercialPolicies) AS commercialPolicies,
        (SELECT COUNT(*) FROM auditEvents) AS auditEvents
    `);

    await conn.query("COMMIT");

    console.log(JSON.stringify({
      mode: "READ ONLY",
      identity: {
        dbName: identity?.dbName ?? null,
        hostname: identity?.hostname ?? null,
        ssl: Boolean(ssl),
        globalReadOnly: identity?.globalReadOnly ?? null,
        txReadOnly: identity?.txReadOnly ?? null,
      },
      drizzleMigrations: migrations,
      tableCount: tableNames.length,
      pendingNetworkTables: presence,
      professionalProfilesColumns: profileCols,
      adminJoinRequestsNetworkColumns: joinCols,
      networkExecutorsNetworkColumns: executorCols,
      pendingTableCounts: counts,
      coreCounts: orphanHints,
    }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
