/**
 * Aplica as migrations oficiais 0000–0055 em oju_midia_qa.
 * Carrega SOMENTE .env.qa. Não usa drizzle-kit migrate: o kit envia
 * arquivos multi-statement (ex.: 0040) numa query só e o MySQL recusa.
 * O SQL dos arquivos não é alterado. Hash = SHA-256 do arquivo intacto
 * (igual ao drizzle-kit / scripts/apply-sql-migration.ts).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import { mysqlConnectionFromUrl } from "../server/mysqlConnection";
import { requireQaDatabaseUrl } from "./qaEnv";

const journal = JSON.parse(readFileSync(resolve("drizzle/meta/_journal.json"), "utf8")) as {
  entries: Array<{ tag: string; when: number }>;
};

function splitStatements(sql: string) {
  const statements: string[] = [];
  for (const chunk of sql.split("--> statement-breakpoint")) {
    const stripped = chunk
      .split("\n")
      .filter(line => !line.trim().startsWith("--"))
      .join("\n");
    for (const part of stripped.split(";")) {
      const trimmed = part.trim();
      if (trimmed) statements.push(trimmed);
    }
  }
  return statements;
}

const databaseUrl = requireQaDatabaseUrl();
const { uri, ssl } = mysqlConnectionFromUrl(databaseUrl);
const connection = await mysql.createConnection({ uri, ssl, multipleStatements: false });

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);

  for (const entry of journal.entries) {
    const file = resolve("drizzle", `${entry.tag}.sql`);
    const body = readFileSync(file);
    const hash = createHash("sha256").update(body).digest("hex");
    const [existing] = (await connection.query("SELECT id FROM `__drizzle_migrations` WHERE hash = ? LIMIT 1", [
      hash,
    ])) as [Array<{ id: number }>, unknown];
    if (existing[0]) {
      console.log(`já aplicada: ${entry.tag}`);
      continue;
    }

    const statements = splitStatements(body.toString("utf8"));
    for (const statement of statements) {
      await connection.query(statement);
    }
    await connection.query("INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)", [
      hash,
      entry.when,
    ]);
    console.log(`aplicada: ${entry.tag} (${statements.length} statements)`);
  }
} finally {
  await connection.end();
}
