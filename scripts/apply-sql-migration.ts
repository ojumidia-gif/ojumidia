/**
 * Aplica UM arquivo SQL local no Aiven, statement a statement.
 * drizzle-kit migrate envia o arquivo inteiro numa query só (falha se houver 2+ statements).
 * Não reescreve o SQL. Hash = SHA-256 do arquivo intacto.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import { mysqlConnectionFromUrl } from "../server/mysqlConnection";

const tag = process.argv[2];
const createdAt = Number(process.argv[3]);
if (!tag || !Number.isFinite(createdAt)) {
  throw new Error("Uso: tsx scripts/apply-sql-migration.ts <tag-sem-sql> <created_at>");
}

function splitStatements(sql: string) {
  const stripped = sql
    .split("\n")
    .filter(line => !line.trim().startsWith("--"))
    .join("\n");
  return stripped.split(";").map(part => part.trim()).filter(Boolean);
}

async function main() {
  const file = resolve("drizzle", `${tag}.sql`);
  const body = readFileSync(file);
  const hash = createHash("sha256").update(body).digest("hex");
  const statements = splitStatements(body.toString("utf8"));
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL ausente.");
  const { uri, ssl } = mysqlConnectionFromUrl(raw);
  const conn = await mysql.createConnection({ uri, ssl, multipleStatements: false });
  const applied: string[] = [];
  try {
    const [existing] = await conn.query("SELECT id FROM `__drizzle_migrations` WHERE hash = ? LIMIT 1", [hash]) as [Array<{ id: number }>, unknown];
    if (existing[0]) {
      console.log(JSON.stringify({ skipped: true, reason: "hash already recorded", tag, hash, id: existing[0].id }));
      return;
    }
    for (const statement of statements) {
      await conn.query(statement);
      applied.push(statement.slice(0, 80).replace(/\s+/g, " "));
    }
    await conn.query("INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)", [hash, createdAt]);
    console.log(JSON.stringify({ ok: true, tag, hash, createdAt, statements: statements.length, applied: applied.length }));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      tag,
      hash,
      appliedCount: applied.length,
      applied,
      error: error instanceof Error ? error.message : String(error),
    }));
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
