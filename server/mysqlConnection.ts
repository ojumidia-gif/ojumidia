export type MysqlSslOption = { rejectUnauthorized: boolean };

export function mysqlConnectionFromUrl(raw: string): { uri: string; ssl?: MysqlSslOption } {
  const url = new URL(raw);
  const sslMode = (url.searchParams.get("ssl-mode") || url.searchParams.get("sslMode") || "").trim().toUpperCase();
  const sslJson = url.searchParams.get("ssl");
  url.searchParams.delete("ssl-mode");
  url.searchParams.delete("sslMode");
  url.searchParams.delete("ssl");

  let ssl: MysqlSslOption | undefined;
  if (sslJson) {
    try {
      const parsed = JSON.parse(sslJson) as MysqlSslOption | boolean;
      ssl = typeof parsed === "boolean" ? { rejectUnauthorized: parsed } : parsed;
    } catch {
      ssl = { rejectUnauthorized: true };
    }
  } else if (sslMode === "DISABLED") {
    ssl = undefined;
  } else if (sslMode === "REQUIRED") {
    ssl = { rejectUnauthorized: false };
  } else if (sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY") {
    ssl = { rejectUnauthorized: true };
  } else if (sslMode) {
    ssl = { rejectUnauthorized: false };
  }

  return { uri: url.toString(), ssl };
}
