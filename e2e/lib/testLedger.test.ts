import { describe, expect, it } from "vitest";
import { TestLedger } from "./testLedger";

describe("TestLedger", () => {
  it("registra id imediatamente", () => {
    const ledger = new TestLedger("QA-AUTO-1-abc");
    ledger.add("opportunity", 91);
    expect(ledger.owns("opportunity", 91)).toBe(true);
    expect(ledger.list()).toHaveLength(1);
  });

  it("registra storageKey só dentro do prefixo do run", () => {
    const ledger = new TestLedger("QA-AUTO-1-abc");
    ledger.add("mediaAsset", 7, `${ledger.storagePrefix}cover.jpg`);
    expect(ledger.list()[0]?.storageKey).toContain("qa-auto/");
    expect(() => ledger.add("mediaAsset", 8, "uploads/real.jpg")).toThrow(/prefixo/);
  });

  it("recusa apagar id externo", () => {
    const ledger = new TestLedger();
    ledger.add("production", 1);
    expect(() => ledger.assertOwned("production", 999)).toThrow(/não pertence/);
  });

  it("cleanup failure quando prova de ausência falha", async () => {
    const ledger = new TestLedger();
    ledger.add("opportunity", 3);
    ledger.setCleanupHandler("opportunity", async () => ({ gone: false, detail: "ainda existe" }));
    const result = await ledger.runCleanup();
    expect(result.ok).toBe(false);
  });

  it("cleanup failure quando não há handler para o kind", async () => {
    const ledger = new TestLedger();
    ledger.add("joinRequest", 4);
    const result = await ledger.runCleanup();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("esperado falha");
    expect(result.reason).toMatch(/sem handler/);
  });

  it("registra relação com recurso pai", () => {
    const ledger = new TestLedger("QA-AUTO-1-abc");
    ledger.add("joinRequest", 1);
    ledger.add("professionalProfile", 2, undefined, { kind: "joinRequest", id: 1 });
    expect(ledger.list()[1]?.parentKind).toBe("joinRequest");
    expect(ledger.list()[1]?.parentId).toBe(1);
  });

  it("cleanup ok quando handler prova ausência", async () => {
    const ledger = new TestLedger();
    ledger.add("opportunity", 3);
    ledger.setCleanupHandler("opportunity", async () => ({ gone: true }));
    expect((await ledger.runCleanup()).ok).toBe(true);
  });
});

