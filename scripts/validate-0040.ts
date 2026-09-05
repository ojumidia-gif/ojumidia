import "dotenv/config";
import mysql from "mysql2/promise";
import { mysqlConnectionFromUrl } from "../server/mysqlConnection";

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL ausente.");
  const { uri, ssl } = mysqlConnectionFromUrl(raw);
  const conn = await mysql.createConnection({ uri, ssl });
  try {
    const checks = [
      ["publications columns", "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'publications' AND COLUMN_NAME IN ('scheduledAt','highlightExpiresAt') ORDER BY COLUMN_NAME"],
      ["mediaAssets photographerId", "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mediaAssets' AND COLUMN_NAME = 'photographerId'"],
      ["networkExecutors public fields", "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'networkExecutors' AND COLUMN_NAME IN ('publicSlug','publicVisible') ORDER BY COLUMN_NAME"],
      ["indexes 0040", "SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME IN ('publication_home_idx','publication_scheduled_idx','media_photographer_idx','networkExecutors_publicSlug_unique') GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE ORDER BY TABLE_NAME, INDEX_NAME"],
      ["explain home curated", "EXPLAIN SELECT id FROM publications WHERE status = 'Publicada' AND isPublic = 1 AND deletedAt IS NULL AND (homePlacement <> 'Nenhum' OR manualFeatured = 1) LIMIT 40"],
      ["explain scheduled", "EXPLAIN SELECT id FROM publications WHERE status = 'Aprovada' AND scheduledAt IS NOT NULL AND deletedAt IS NULL"],
      ["explain photographer media", "EXPLAIN SELECT id FROM mediaAssets WHERE photographerId IS NOT NULL AND state = 'Ativo'"],
    ] as const;
    const report: Record<string, unknown> = {};
    for (const [label, sql] of checks) {
      const started = Date.now();
      const [rows] = await conn.query(sql);
      report[label] = { ms: Date.now() - started, rows };
    }
    const [counts] = await conn.query("SELECT (SELECT COUNT(*) FROM publications) publications, (SELECT COUNT(*) FROM mediaAssets) mediaAssets, (SELECT COUNT(*) FROM networkExecutors) networkExecutors, (SELECT COUNT(*) FROM users) users");
    report.counts = counts;
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
