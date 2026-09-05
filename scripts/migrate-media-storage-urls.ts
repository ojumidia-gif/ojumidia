import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

const FROM = "/manus-storage/";
const TO = "/media-storage/";

async function rewrite(label: string, query: ReturnType<typeof sql>) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível.");
  const result = await db.execute(query);
  const affected = Array.isArray(result) ? undefined : (result as { affectedRows?: number }).affectedRows;
  console.log(`${label}_affected=${affected ?? "ok"}`);
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("migration=skipped_no_database");
    process.exit(0);
  }

  await rewrite("mediaAssets", sql`UPDATE mediaAssets SET assetUrl = REPLACE(assetUrl, ${FROM}, ${TO}) WHERE assetUrl LIKE ${`${FROM}%`}`);
  await rewrite("uploadSessions", sql`UPDATE uploadSessions SET assetUrl = REPLACE(assetUrl, ${FROM}, ${TO}) WHERE assetUrl LIKE ${`${FROM}%`}`);
  await rewrite("administratorResponsibilityTerms", sql`UPDATE administratorResponsibilityTerms SET signedDocumentUrl = REPLACE(signedDocumentUrl, ${FROM}, ${TO}) WHERE signedDocumentUrl LIKE ${`${FROM}%`}`);
  await rewrite("authorizationTerms", sql`UPDATE authorizationTerms SET signedDocumentUrl = REPLACE(signedDocumentUrl, ${FROM}, ${TO}) WHERE signedDocumentUrl LIKE ${`${FROM}%`}`);
  await rewrite("advertisements", sql`UPDATE advertisements SET mediaUrl = REPLACE(mediaUrl, ${FROM}, ${TO}) WHERE mediaUrl LIKE ${`${FROM}%`}`);
  await rewrite("contracts", sql`UPDATE contracts SET documentUrl = REPLACE(documentUrl, ${FROM}, ${TO}) WHERE documentUrl LIKE ${`${FROM}%`}`);
  await rewrite("oralMemories", sql`UPDATE oralMemories SET audioUrl = REPLACE(audioUrl, ${FROM}, ${TO}) WHERE audioUrl LIKE ${`${FROM}%`}`);

  const leftover = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM mediaAssets WHERE assetUrl LIKE ${`${FROM}%`}) AS mediaAssets,
      (SELECT COUNT(*) FROM uploadSessions WHERE assetUrl LIKE ${`${FROM}%`}) AS uploadSessions
  `);
  console.log("leftover=", JSON.stringify(leftover));
  process.exit(0);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
