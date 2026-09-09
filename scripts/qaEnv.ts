import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { assertQaMysqlTarget } from "../e2e/lib/qaTarget";

const qaEnvPath = resolve(process.cwd(), ".env.qa");

export function loadQaEnvFile(): NodeJS.ProcessEnv {
  if (!existsSync(qaEnvPath)) {
    throw new Error("ABORTADO: .env.qa não encontrado. Copie .env.qa.example para .env.qa e preencha senhas locais. Não use o .env (Aiven).");
  }
  const result = loadDotenv({ path: qaEnvPath, override: true });
  if (result.error) throw result.error;
  return process.env;
}

export function requireQaDatabaseUrl(): string {
  loadQaEnvFile();
  const check = assertQaMysqlTarget(process.env.DATABASE_URL);
  if (!check.ok) throw new Error(check.reason);
  return process.env.DATABASE_URL!;
}
