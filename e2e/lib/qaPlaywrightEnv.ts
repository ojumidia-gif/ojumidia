import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { assertQaMysqlTarget } from "./qaTarget";

export function readQaEnvFile(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.qa");
  if (!existsSync(path)) {
    throw new Error("ABORTADO: .env.qa ausente. Não herdar o .env (Aiven). Copie .env.qa.example.");
  }
  return parse(readFileSync(path));
}

export function playwrightQaWebServerEnv(): NodeJS.ProcessEnv {
  const qa = readQaEnvFile();
  const check = assertQaMysqlTarget(qa.DATABASE_URL);
  if (!check.ok) throw new Error(check.reason);

  const clearedStorage: NodeJS.ProcessEnv = {
    S3_BUCKET: "",
    S3_ENDPOINT: "",
    S3_ACCESS_KEY_ID: "",
    S3_SECRET_ACCESS_KEY: "",
    TIGRIS_BUCKET: "",
    TIGRIS_ENDPOINT: "",
    TIGRIS_ACCESS_KEY_ID: "",
    TIGRIS_SECRET_ACCESS_KEY: "",
    AWS_ACCESS_KEY_ID: "",
    AWS_SECRET_ACCESS_KEY: "",
    BUILT_IN_FORGE_API_URL: "",
    BUILT_IN_FORGE_API_KEY: "",
  };

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...clearedStorage,
    DATABASE_URL: qa.DATABASE_URL,
    LOCAL_STORAGE_DIR: qa.LOCAL_STORAGE_DIR || ".qa-storage",
    E2E_ALLOW_MUTATION: qa.E2E_ALLOW_MUTATION || "1",
    E2E_DATABASE_ALLOWED_HOSTS: qa.E2E_DATABASE_ALLOWED_HOSTS || "127.0.0.1",
    E2E_DATABASE_NAME: qa.E2E_DATABASE_NAME || "oju_midia_qa",
    E2E_DATABASE_PORT: qa.E2E_DATABASE_PORT || "3307",
    E2E_STORAGE_ISOLATED: qa.E2E_STORAGE_ISOLATED || "1",
    E2E_STORAGE_PREFIX: qa.E2E_STORAGE_PREFIX || "qa-auto/",
    E2E_PORT: qa.E2E_PORT || "3100",
    PORT: qa.PORT || "3100",
    NODE_ENV: "development",
    OJU_LOCAL_DEV_LOGIN_ENABLED: "false",
    GOOGLE_OAUTH_REDIRECT_URI:
      qa.GOOGLE_OAUTH_REDIRECT_URI?.trim() || "http://127.0.0.1:3100/api/auth/google/callback",
  };

  for (const key of [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "E2E_QA_PARTICIPANT_EMAIL",
    "E2E_FASE2_CAPTURE_PARTICIPANT",
    "E2E_AUTH_CDP_URL",
    "E2E_AUTH_CDP_PORT",
    "QA_CHROME_PROFILE",
  ] as const) {
    if (qa[key]?.trim()) env[key] = qa[key];
  }

  return env;
}
