import "dotenv/config";
import { like, sql } from "drizzle-orm";
import { mediaAssets } from "../drizzle/schema";
import { getDb } from "../server/db";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("legacy_media_count=unavailable");
    return;
  }
  const [legacy] = await db.select({ n: sql<number>`count(*)` }).from(mediaAssets).where(like(mediaAssets.assetUrl, "/manus-storage/%"));
  const [current] = await db.select({ n: sql<number>`count(*)` }).from(mediaAssets).where(like(mediaAssets.assetUrl, "/media-storage/%"));
  console.log(`legacy_manus_storage=${legacy?.n ?? 0}`);
  console.log(`current_media_storage=${current?.n ?? 0}`);
  process.exit(0);
}

main().catch(error => {
  const detail = error instanceof Error ? `${error.message}${error.cause ? ` | ${String(error.cause)}` : ""}` : "erro";
  console.error(`count_failed=${detail}`);
  process.exit(1);
});
