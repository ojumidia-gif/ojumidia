/**
 * Dump lógico Aiven (schema + dados). Sem ALTER. Uso: ponto de recuperação antes de 0048–0053.
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import { mysqlConnectionFromUrl } from "../server/mysqlConnection";

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL ausente.");
  const { uri, ssl } = mysqlConnectionFromUrl(raw);
  const conn = await mysql.createConnection({ uri, ssl });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(process.cwd(), "tmp");
  mkdirSync(dir, { recursive: true });
  const out = resolve(dir, `aiven-logical-backup-${stamp}.sql`);
  try {
    await conn.query("START TRANSACTION READ ONLY");
    const [[meta]] = await conn.query("SELECT DATABASE() AS dbName, NOW() AS takenAt") as [Array<{ dbName: string; takenAt: Date }>, unknown];
    const [tables] = await conn.query(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
    ) as [Array<{ name: string }>, unknown];
    const chunks: string[] = [
      `-- Ojú logical backup ${stamp}`,
      `-- database ${meta.dbName}`,
      "SET FOREIGN_KEY_CHECKS=0;",
      "",
    ];
    for (const { name } of tables) {
      const [createRows] = await conn.query(`SHOW CREATE TABLE \`${name}\``) as [Array<{ "Create Table": string }>, unknown];
      chunks.push(`DROP TABLE IF EXISTS \`${name}\`;`);
      chunks.push(`${createRows[0]["Create Table"]};`);
      chunks.push("");
      const [rows] = await conn.query(`SELECT * FROM \`${name}\``) as [Array<Record<string, unknown>>, unknown];
      for (const row of rows) {
        const cols = Object.keys(row).map(col => `\`${col}\``).join(", ");
        const vals = Object.values(row).map(value => conn.escape(value)).join(", ");
        chunks.push(`INSERT INTO \`${name}\` (${cols}) VALUES (${vals});`);
      }
      chunks.push("");
    }
    chunks.push("SET FOREIGN_KEY_CHECKS=1;");
    const body = chunks.join("\n");
    writeFileSync(out, body, "utf8");
    await conn.query("COMMIT");
    console.log(JSON.stringify({
      file: out,
      bytes: Buffer.byteLength(body),
      tables: tables.length,
      dbName: meta.dbName,
    }));
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
