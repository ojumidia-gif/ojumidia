export const ADMIN_ID_PREFIX = "ADMIN-";

export function formatAdminId(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) return "";
  return `${ADMIN_ID_PREFIX}${String(userId).padStart(8, "0")}`;
}

export function parseAdminId(value: string) {
  const trimmed = value.trim().toUpperCase();
  const match = trimmed.match(/^ADMIN-0*([1-9]\d*)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const accountStatuses = ["Ativo", "Suspenso", "Bloqueado", "Revogado"] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export function isAccountOperable(status: string | null | undefined) {
  return (status ?? "Ativo") === "Ativo";
}

export function isClosedCaseStatus(status: string) {
  return status === "Resolvida" || status === "Rejeitada" || status === "Arquivada";
}

export function formatGovernanceCaseCode(year: number, sequence: number) {
  return `DEN-${year}-${String(sequence).padStart(6, "0")}`;
}

export function nextSessionEpoch(current: number | null | undefined) {
  return Math.max(0, current ?? 0) + 1;
}

export function sessionIsRevoked(tokenEpoch: number | null | undefined, accountEpoch: number | null | undefined) {
  return (accountEpoch ?? 0) > (tokenEpoch ?? 0);
}

export const SENSITIVE_AUDIT_KEYS = ["password", "client_secret", "clientSecret", "jwt", "token", "access_token", "refresh_token", "id_token"];

export function stripSensitiveAuditValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripSensitiveAuditValue);
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_AUDIT_KEYS.some(item => key.toLowerCase().includes(item.toLowerCase()))) continue;
    output[key] = stripSensitiveAuditValue(entry);
  }
  return output;
}
