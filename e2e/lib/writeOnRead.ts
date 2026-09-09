/** Queries tRPC que persistem (E2E-02.3). Nunca tratar como read-only. */
export const WRITE_ON_READ_QUERIES = [
  "opportunities.list",
  "opportunities.mine",
  "opportunities.match",
  "opportunities.eligible",
  "community.publicDirectory",
  "community.publicInstitutions",
  "community.listInstitutionVisibilities",
  "community.visibilityRevenueSummary",
] as const;

export type WriteOnReadQuery = (typeof WRITE_ON_READ_QUERIES)[number];

export function isWriteOnReadQuery(procedure: string): boolean {
  return (WRITE_ON_READ_QUERIES as readonly string[]).includes(procedure);
}

export function assertReadSafeProcedure(procedure: string, intent?: "read" | "auth-probe"): void {
  if (isWriteOnReadQuery(procedure) && intent !== "auth-probe") {
    throw new Error(
      `QA-AUTO: ${procedure} está na denylist de queries com escrita. Não tratar como read-only.`,
    );
  }
}
