import { getDb } from "./db";
import { cleanupExpiredAbandonedUploads } from "./mediaLifecycle";
import { purgeExpiredEditorialTrash } from "./editorialTrash";
import { runEditorialScheduleJobs } from "./editorialAutomation";
import { remindOpenCases } from "./governance";

export async function runProductionMaintenanceJobs() {
  const db = await getDb();
  if (!db) return { ok: false as const, error: "database-unavailable" };
  const result = await purgeExpiredEditorialTrash(db);
  const uploads = await cleanupExpiredAbandonedUploads(db, -1);
  const schedule = await runEditorialScheduleJobs(db);
  const reminders = await remindOpenCases(db);
  return { ok: true as const, skipped: false as const, trash: result, uploads, schedule, reminders };
}
