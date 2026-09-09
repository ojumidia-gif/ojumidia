import { createTestRunId, storagePrefixForRun } from "./envGuard";

export const LEDGER_KINDS = [
  "commercialRequest",
  "opportunity",
  "production",
  "mediaAsset",
  "publication",
  "notification",
  "auditEvent",
  "collaboratorGrant",
  "partner",
  "professionalProfile",
  "joinRequest",
  "user",
  "taxonomy",
  "careRequest",
  "revenueLead",
  "commercialPolicy",
  "networkVoice",
  "other",
] as const;

export type LedgerKind = (typeof LEDGER_KINDS)[number];

export type LedgerEntry = {
  kind: LedgerKind;
  id: number | string;
  storageKey?: string;
  parentKind?: LedgerKind;
  parentId?: number | string;
  createdAt: string;
  runId: string;
};

export type CleanupHandler = (entry: LedgerEntry) => Promise<{ gone: boolean; detail?: string }>;

/**
 * Ordem de cleanup (schema atual, sem DELETE nesta fase):
 * 1. objetos Tigris com storageKey do ledger
 * 2. networkProductionMedia
 * 3. networkProductions (opportunityId único)
 * 4. networkOpportunityInvites / specialties
 * 5. networkOpportunities
 * 6. commercialActivities → commercialRequests
 * 7. relações de publication → publications
 * 8. networkNotifications
 * 9. auditEvents só se o teste os criou e o ID está no ledger
 *
 * Não há SQL destrutivo aqui. Handlers são registrados pelo teste futuro.
 */
export const CLEANUP_KIND_ORDER: LedgerKind[] = [
  "mediaAsset",
  "production",
  "opportunity",
  "publication",
  "networkVoice",
  "commercialRequest",
  "careRequest",
  "revenueLead",
  "notification",
  "auditEvent",
  "collaboratorGrant",
  "partner",
  "professionalProfile",
  "joinRequest",
  "user",
  "taxonomy",
  "commercialPolicy",
  "other",
];

export class TestLedger {
  readonly runId: string;
  readonly storagePrefix: string;
  private readonly entries: LedgerEntry[] = [];
  private readonly handlers = new Map<LedgerKind, CleanupHandler>();

  constructor(runId = createTestRunId()) {
    this.runId = runId;
    this.storagePrefix = storagePrefixForRun(runId);
  }

  add(
    kind: LedgerKind,
    id: number | string,
    storageKey?: string,
    parent?: { kind: LedgerKind; id: number | string },
  ): LedgerEntry {
    if (storageKey && !storageKey.startsWith(this.storagePrefix)) {
      throw new Error(`storageKey fora do prefixo do run (${this.storagePrefix}). Não registrar nem apagar.`);
    }
    if (this.owns(kind, id)) return this.entries.find(item => item.kind === kind && String(item.id) === String(id))!;
    const entry: LedgerEntry = {
      kind,
      id,
      storageKey,
      parentKind: parent?.kind,
      parentId: parent?.id,
      createdAt: new Date().toISOString(),
      runId: this.runId,
    };
    this.entries.push(entry);
    return entry;
  }

  list(): LedgerEntry[] {
    return [...this.entries];
  }

  owns(kind: LedgerKind, id: number | string): boolean {
    return this.entries.some(item => item.kind === kind && String(item.id) === String(id));
  }

  assertOwned(kind: LedgerKind, id: number | string): void {
    if (!this.owns(kind, id)) {
      throw new Error(`QA-AUTO: recusa apagar ${kind}#${id} — não pertence a este TestLedger.`);
    }
  }

  setCleanupHandler(kind: LedgerKind, handler: CleanupHandler): void {
    this.handlers.set(kind, handler);
  }

  async runCleanup(): Promise<{ ok: true } | { ok: false; reason: string }> {
    const ordered = [...this.entries].sort(
      (a, b) => CLEANUP_KIND_ORDER.indexOf(a.kind) - CLEANUP_KIND_ORDER.indexOf(b.kind),
    );
    for (const entry of ordered) {
      const handler = this.handlers.get(entry.kind);
      if (!handler) {
        return { ok: false, reason: `Cleanup sem handler para ${entry.kind}#${entry.id} — recurso criado não pode ficar órfão.` };
      }
      const result = await handler(entry);
      if (!result.gone) {
        return { ok: false, reason: `Cleanup não comprovou ausência de ${entry.kind}#${entry.id}${result.detail ? `: ${result.detail}` : ""}` };
      }
    }
    return { ok: true };
  }
}
