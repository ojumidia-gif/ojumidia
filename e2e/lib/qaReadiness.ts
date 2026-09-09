import "dotenv/config";
import { existsSync } from "node:fs";
import { mutationGuardFromProcessEnv, parseDatabaseHost, parseUrlHost } from "./envGuard";
import { hasPersonaState } from "../personas";

export type DbHostKind = "missing" | "invalid" | "aiven" | "loopback" | "other";

export function classifyDatabaseHost(databaseUrl: string | undefined): { kind: DbHostKind; isAiven: boolean } {
  if (!databaseUrl) return { kind: "missing", isAiven: false };
  const host = parseDatabaseHost(databaseUrl);
  if (!host) return { kind: "invalid", isAiven: false };
  if (host.includes("aivencloud.com") || host.includes("aiven.io")) return { kind: "aiven", isAiven: true };
  if (host === "127.0.0.1" || host === "localhost" || host === "::1") return { kind: "loopback", isAiven: false };
  return { kind: "other", isAiven: false };
}

export function qaMutationReadiness(env: NodeJS.ProcessEnv = process.env) {
  const baseURL = env.E2E_BASE_URL || `http://127.0.0.1:${env.E2E_PORT || "3100"}`;
  const guard = mutationGuardFromProcessEnv(env, baseURL);
  const db = classifyDatabaseHost(env.DATABASE_URL);
  const baseHost = parseUrlHost(baseURL);
  return {
    guard,
    baseHost,
    databaseKind: db.kind,
    allowMutation: env.E2E_ALLOW_MUTATION === "1",
    allowedDatabaseHostsConfigured: Boolean(env.E2E_DATABASE_ALLOWED_HOSTS?.trim()),
    storageIsolated: env.E2E_STORAGE_ISOLATED === "1",
    personas: {
      professional: hasPersonaState("professional"),
      territorialAdmin: hasPersonaState("territorialAdmin"),
      superAdmin: hasPersonaState("superAdmin"),
      professionalNoTerritory: hasPersonaState("professionalNoTerritory"),
    },
    authDirPresent: existsSync("e2e/.auth"),
  };
}
