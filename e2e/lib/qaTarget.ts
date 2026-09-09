export const QA_DATABASE_NAME = "oju_midia_qa";
export const QA_DATABASE_PORT = "3307";
export const DEV_DATABASE_NAME = "oju_midia";

export type MysqlTarget = {
  host: string;
  port: string;
  database: string;
};

export function parseMysqlUrl(databaseUrl: string): MysqlTarget | null {
  try {
    const withProtocol = databaseUrl.startsWith("mysql:")
      ? databaseUrl.replace(/^mysql:\/\//, "https://")
      : databaseUrl;
    const parsed = new URL(withProtocol);
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, "").split("/")[0] || "").split("?")[0];
    if (!parsed.hostname || !database) return null;
    return {
      host: parsed.hostname.toLowerCase(),
      port: parsed.port || "3306",
      database,
    };
  } catch {
    return null;
  }
}

export type QaTargetResult = { ok: true; target: MysqlTarget } | { ok: false; reason: string };

export function assertQaMysqlTarget(databaseUrl: string | undefined): QaTargetResult {
  if (!databaseUrl?.trim()) {
    return { ok: false, reason: "DATABASE_URL ausente. Use somente .env.qa apontando para o MySQL Docker QA." };
  }
  const target = parseMysqlUrl(databaseUrl);
  if (!target) return { ok: false, reason: "DATABASE_URL inválida (não foi possível ler host/porta/database sem expor senha)." };

  if (target.host.includes("aivencloud.com") || target.host.includes("aiven.io")) {
    return { ok: false, reason: "ABORTADO: DATABASE_URL aponta para Aiven. O QA Docker nunca pode usar Aiven/Beta." };
  }
  if (target.host !== "127.0.0.1" && target.host !== "localhost" && target.host !== "::1") {
    return { ok: false, reason: `ABORTADO: host ${target.host} não é loopback. QA exige 127.0.0.1:3307.` };
  }
  if (target.port !== QA_DATABASE_PORT) {
    return { ok: false, reason: `ABORTADO: porta ${target.port} não é ${QA_DATABASE_PORT}. Porta 3306 é desenvolvimento (oju_midia), não QA.` };
  }
  if (target.database === DEV_DATABASE_NAME) {
    return { ok: false, reason: `ABORTADO: database ${DEV_DATABASE_NAME} é o banco de desenvolvimento. QA exige ${QA_DATABASE_NAME}.` };
  }
  if (target.database !== QA_DATABASE_NAME) {
    return { ok: false, reason: `ABORTADO: database ${target.database} não é ${QA_DATABASE_NAME}.` };
  }
  return { ok: true, target };
}
