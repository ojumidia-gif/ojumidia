import { getDb } from "../../server/db";
import { mutationGuardFromProcessEnv } from "./envGuard";
import { assertQaMysqlTarget } from "./qaTarget";

export async function requireQaDb() {
  const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${process.env.E2E_PORT || "3100"}`;
  const guard = mutationGuardFromProcessEnv(process.env, baseURL);
  if (!guard.allowed) {
    throw new Error(`QA-AUTO banco recusado: ${guard.reason}`);
  }
  const target = assertQaMysqlTarget(process.env.DATABASE_URL);
  if (!target.ok) throw new Error(target.reason);
  const db = await getDb();
  if (!db) throw new Error("QA-AUTO: banco indisponível.");
  return db;
}
