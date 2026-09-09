import { parseMysqlUrl, QA_DATABASE_NAME, QA_DATABASE_PORT, DEV_DATABASE_NAME } from "./qaTarget";

export const FORBIDDEN_PUBLIC_HOSTS = [
  "ojumidia.com.br",
  "www.ojumidia.com.br",
  "ojumidia.onrender.com",
] as const;

const AIVEN_HOST_MARKERS = ["aivencloud.com", "aiven.io"];

export type MutationGuardInput = {
  allowMutation?: string;
  baseURL: string;
  databaseUrl?: string;
  allowedDatabaseHosts?: string;
  forbiddenDatabaseHosts?: string;
  allowedBaseHosts?: string;
  storagePrefix?: string;
  mediaMutation?: boolean;
  storageIsolated?: string;
  expectedDatabaseName?: string;
  expectedDatabasePort?: string;
};

export type MutationGuardResult =
  | { allowed: true; runId: string; storagePrefix: string }
  | { allowed: false; reason: string };

export function createTestRunId(now = Date.now(), random = Math.random().toString(36).slice(2, 8)): string {
  return `QA-AUTO-${now}-${random}`;
}

export function storagePrefixForRun(runId: string): string {
  return `qa-auto/${runId}/`;
}

export function parseUrlHost(value: string): string | null {
  try {
    const normalized = value.includes("://") ? value : `https://${value}`;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function parseDatabaseHost(databaseUrl: string): string | null {
  return parseMysqlUrl(databaseUrl)?.host ?? null;
}

function csvHosts(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
}

function isLoopback(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function isAivenHost(host: string): boolean {
  return AIVEN_HOST_MARKERS.some(marker => host === marker || host.endsWith(`.${marker}`));
}

export function evaluateMutationGuard(input: MutationGuardInput): MutationGuardResult {
  if (input.allowMutation !== "1") {
    return { allowed: false, reason: "E2E_ALLOW_MUTATION ausente. Mutations exigem autorização explícita do operador." };
  }

  const baseHost = parseUrlHost(input.baseURL);
  if (!baseHost) return { allowed: false, reason: "baseURL inválida." };
  if ((FORBIDDEN_PUBLIC_HOSTS as readonly string[]).includes(baseHost)) {
    return { allowed: false, reason: `baseURL pública/produção bloqueada: ${baseHost}` };
  }
  const extraBase = csvHosts(input.allowedBaseHosts);
  if (!isLoopback(baseHost) && !extraBase.includes(baseHost)) {
    return { allowed: false, reason: `baseURL ${baseHost} não está na allowlist de testes mutantes (E2E_BASE_ALLOWED_HOSTS).` };
  }

  if (!input.databaseUrl) {
    return { allowed: false, reason: "DATABASE_URL ausente. Mutation exige banco explicitamente autorizado." };
  }
  const parsed = parseMysqlUrl(input.databaseUrl);
  if (!parsed) return { allowed: false, reason: "DATABASE_URL inválida." };
  const dbHost = parsed.host;
  if (isAivenHost(dbHost)) {
    return { allowed: false, reason: "DATABASE_URL aponta para Aiven. Mutations Playwright são abortadas neste host." };
  }
  if (parsed.database === DEV_DATABASE_NAME) {
    return { allowed: false, reason: `database ${DEV_DATABASE_NAME} é desenvolvimento (porta 3306). Mutation recusada.` };
  }
  const expectedName = input.expectedDatabaseName?.trim();
  if (expectedName && parsed.database !== expectedName) {
    return { allowed: false, reason: `database ${parsed.database} ≠ E2E_DATABASE_NAME=${expectedName}.` };
  }
  const expectedPort = input.expectedDatabasePort?.trim();
  if (expectedPort && parsed.port !== expectedPort) {
    return { allowed: false, reason: `porta ${parsed.port} ≠ E2E_DATABASE_PORT=${expectedPort}.` };
  }
  if (expectedName === QA_DATABASE_NAME || expectedPort === QA_DATABASE_PORT) {
    if (parsed.port !== QA_DATABASE_PORT || parsed.database !== QA_DATABASE_NAME) {
      return { allowed: false, reason: `Mutation QA exige ${QA_DATABASE_NAME} na porta ${QA_DATABASE_PORT}.` };
    }
  }
  const forbidden = csvHosts(input.forbiddenDatabaseHosts);
  if (forbidden.includes(dbHost)) {
    return { allowed: false, reason: `DATABASE_URL host ${dbHost} está em E2E_DATABASE_FORBIDDEN_HOSTS.` };
  }
  const allowedDb = csvHosts(input.allowedDatabaseHosts);
  if (!allowedDb.length) {
    return { allowed: false, reason: "E2E_DATABASE_ALLOWED_HOSTS vazio. Sem allowlist não há mutation." };
  }
  if (!allowedDb.includes(dbHost)) {
    return { allowed: false, reason: `DATABASE_URL host ${dbHost} não está em E2E_DATABASE_ALLOWED_HOSTS.` };
  }

  if (input.mediaMutation) {
    if (input.storageIsolated !== "1") {
      return { allowed: false, reason: "Mídia mutante exige E2E_STORAGE_ISOLATED=1." };
    }
    const prefix = input.storagePrefix || "";
    if (!prefix.startsWith("qa-auto/")) {
      return { allowed: false, reason: "E2E_STORAGE_PREFIX deve começar com qa-auto/." };
    }
  }

  const runId = createTestRunId();
  return { allowed: true, runId, storagePrefix: storagePrefixForRun(runId) };
}

export function mutationGuardFromProcessEnv(env: NodeJS.ProcessEnv, baseURL: string): MutationGuardResult {
  return evaluateMutationGuard({
    allowMutation: env.E2E_ALLOW_MUTATION,
    baseURL,
    databaseUrl: env.DATABASE_URL,
    allowedDatabaseHosts: env.E2E_DATABASE_ALLOWED_HOSTS,
    forbiddenDatabaseHosts: env.E2E_DATABASE_FORBIDDEN_HOSTS,
    allowedBaseHosts: env.E2E_BASE_ALLOWED_HOSTS,
    storagePrefix: env.E2E_STORAGE_PREFIX,
    storageIsolated: env.E2E_STORAGE_ISOLATED,
    expectedDatabaseName: env.E2E_DATABASE_NAME,
    expectedDatabasePort: env.E2E_DATABASE_PORT,
  });
}
