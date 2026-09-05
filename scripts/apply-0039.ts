import "dotenv/config";
import mysql from "mysql2/promise";
import { mysqlConnectionFromUrl } from "../server/mysqlConnection";

const columns = [
  ["collaboratorAccessGrants", "partnerId"],
  ["collaboratorAccessGrants", "territoryId"],
  ["partnerMembers", "territoryId"],
] as const;

async function columnExists(conn: mysql.Connection, table: string, column: string) {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  );
  return rows.length > 0;
}

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL ausente. Não é possível aplicar a 0039.");
  const { uri, ssl } = mysqlConnectionFromUrl(raw);
  const conn = await mysql.createConnection({ uri, ssl });
  try {
    const [dbRows] = await conn.query<mysql.RowDataPacket[]>("SELECT DATABASE() AS db");
    const dbName = dbRows[0]?.db;
    if (!dbName) throw new Error("Nenhum schema selecionado na conexão.");
    const before: Record<string, boolean> = {};
    for (const [table, column] of columns) {
      before[`${table}.${column}`] = await columnExists(conn, table, column);
    }
    for (const [table, column] of columns) {
      if (before[`${table}.${column}`]) continue;
      await conn.query(`ALTER TABLE \`${table}\` ADD \`${column}\` int`);
    }
    const after: Record<string, boolean> = {};
    for (const [table, column] of columns) {
      after[`${table}.${column}`] = await columnExists(conn, table, column);
    }
    const missing = Object.entries(after).filter(([, ok]) => !ok).map(([name]) => name);
    if (missing.length) throw new Error(`Colunas ainda ausentes: ${missing.join(", ")}`);
    console.log(JSON.stringify({ database: dbName, before, after, applied: true }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
