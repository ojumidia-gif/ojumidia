import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import { mysqlConnectionFromUrl } from "../server/mysqlConnection";

const expectedColumns = [
  ["publications", "scheduledAt"],
  ["publications", "highlightExpiresAt"],
  ["mediaAssets", "photographerId"],
  ["networkExecutors", "publicSlug"],
  ["networkExecutors", "publicVisible"],
] as const;

const expectedIndexes = [
  ["publications", "publication_home_idx"],
  ["publications", "publication_scheduled_idx"],
  ["mediaAssets", "media_photographer_idx"],
  ["networkExecutors", "networkExecutors_publicSlug_unique"],
] as const;

const countedTables = ["publications", "mediaAssets", "networkExecutors", "users", "partners", "auditEvents"] as const;

async function columnExists(conn: mysql.Connection, table: string, column: string) {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  );
  return rows.length > 0;
}

async function indexExists(conn: mysql.Connection, table: string, indexName: string) {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
    [table, indexName],
  );
  return rows.length > 0;
}

async function tableCount(conn: mysql.Connection, table: string) {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return Number(rows[0]?.n || 0);
}

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL ausente. Não é possível aplicar a 0040.");
  const parsed = new URL(raw);
  const { uri, ssl } = mysqlConnectionFromUrl(raw);
  const conn = await mysql.createConnection({ uri, ssl, multipleStatements: true });
  try {
    const [dbRows] = await conn.query<mysql.RowDataPacket[]>("SELECT DATABASE() AS db, @@hostname AS hostname, @@version AS version");
    const dbName = dbRows[0]?.db;
    if (!dbName) throw new Error("Nenhum schema selecionado na conexão.");
    const connection = {
      host: parsed.hostname,
      port: parsed.port || "3306",
      database: dbName,
      user: decodeURIComponent(parsed.username || ""),
      ssl: Boolean(ssl),
      serverVersion: dbRows[0]?.version,
      source: "DATABASE_URL from project .env",
    };
    const countsBefore: Record<string, number> = {};
    for (const table of countedTables) countsBefore[table] = await tableCount(conn, table);

    const beforeColumns: Record<string, boolean> = {};
    for (const [table, column] of expectedColumns) beforeColumns[`${table}.${column}`] = await columnExists(conn, table, column);
    const beforeIndexes: Record<string, boolean> = {};
    for (const [table, index] of expectedIndexes) beforeIndexes[`${table}.${index}`] = await indexExists(conn, table, index);

    const sql = readFileSync(resolve(process.cwd(), "drizzle/0040_editorial_platform_scale.sql"), "utf8");
    await conn.query(sql);

    const afterColumns: Record<string, boolean> = {};
    for (const [table, column] of expectedColumns) afterColumns[`${table}.${column}`] = await columnExists(conn, table, column);
    const afterIndexes: Record<string, boolean> = {};
    for (const [table, index] of expectedIndexes) afterIndexes[`${table}.${index}`] = await indexExists(conn, table, index);
    const countsAfter: Record<string, number> = {};
    for (const table of countedTables) countsAfter[table] = await tableCount(conn, table);

    const missingColumns = Object.entries(afterColumns).filter(([, ok]) => !ok).map(([name]) => name);
    const missingIndexes = Object.entries(afterIndexes).filter(([, ok]) => !ok).map(([name]) => name);
    const countDrift = countedTables.filter(table => countsBefore[table] !== countsAfter[table]);
    if (missingColumns.length) throw new Error(`Colunas ainda ausentes: ${missingColumns.join(", ")}`);
    if (missingIndexes.length) throw new Error(`Índices ainda ausentes: ${missingIndexes.join(", ")}`);
    if (countDrift.length) throw new Error(`Contagem de linhas mudou em: ${countDrift.join(", ")}. A 0040 não deve apagar dados.`);

    console.log(JSON.stringify({
      connection,
      countsBefore,
      countsAfter,
      beforeColumns,
      afterColumns,
      beforeIndexes,
      afterIndexes,
      applied: true,
      dataPreserved: true,
    }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
