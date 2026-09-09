import { expect, test } from "../fixtures/cleanup";
import { evaluateMutationGuard, mutationGuardFromProcessEnv } from "../lib/envGuard";
import { TestLedger } from "../lib/testLedger";
import { isWriteOnReadQuery } from "../lib/writeOnRead";

test.describe("QA-AUTO-02 infraestrutura", () => {
  test("baseURL proibida aborta mutation", () => {
    const result = evaluateMutationGuard({
      allowMutation: "1",
      baseURL: "https://ojumidia.com.br",
      databaseUrl: "mysql://qa@127.0.0.1:3307/oju_midia_qa",
      allowedDatabaseHosts: "127.0.0.1",
    });
    expect(result.allowed).toBe(false);
  });

  test("database de desenvolvimento e porta errada abortam", () => {
    expect(
      evaluateMutationGuard({
        allowMutation: "1",
        baseURL: "http://127.0.0.1:3100",
        databaseUrl: "mysql://oju_local:x@127.0.0.1:3306/oju_midia",
        allowedDatabaseHosts: "127.0.0.1",
        expectedDatabaseName: "oju_midia_qa",
        expectedDatabasePort: "3307",
      }).allowed,
    ).toBe(false);
  });

  test("DATABASE_URL Aiven aborta mesmo com flag", () => {
    const result = evaluateMutationGuard({
      allowMutation: "1",
      baseURL: "http://127.0.0.1:3100",
      databaseUrl: "mysql://u:p@demo.aivencloud.com:1234/defaultdb",
      allowedDatabaseHosts: "demo.aivencloud.com",
    });
    expect(result.allowed).toBe(false);
  });

  test("E2E_ALLOW_MUTATION ausente bloqueia helper de mutation", () => {
    const result = mutationGuardFromProcessEnv({ ...process.env, E2E_ALLOW_MUTATION: undefined }, "http://127.0.0.1:3100");
    expect(result.allowed).toBe(false);
  });

  test("QA Docker 3307/oju_midia_qa permite mutation autorizada", () => {
    const result = evaluateMutationGuard({
      allowMutation: "1",
      baseURL: "http://127.0.0.1:3100",
      databaseUrl: "mysql://oju_qa:x@127.0.0.1:3307/oju_midia_qa",
      allowedDatabaseHosts: "127.0.0.1",
      expectedDatabaseName: "oju_midia_qa",
      expectedDatabasePort: "3307",
      storageIsolated: "1",
    });
    expect(result.allowed).toBe(true);
  });

  test("ledger registra id e storageKey", ({ ledger }) => {
    ledger.add("opportunity", "opp-1");
    ledger.add("mediaAsset", "media-1", `${ledger.storagePrefix}clip.mp4`);
    expect(ledger.owns("opportunity", "opp-1")).toBe(true);
    expect(ledger.owns("mediaAsset", "media-1")).toBe(true);
    expect(() => ledger.assertOwned("opportunity", "nao-e-deste-run")).toThrow();
    ledger.setCleanupHandler("opportunity", async () => ({ gone: true, detail: "id simbólico de infra, sem linha no banco" }));
    ledger.setCleanupHandler("mediaAsset", async () => ({ gone: true, detail: "id simbólico de infra, sem objeto de storage" }));
  });

  test("query da denylist não é read-only", () => {
    expect(isWriteOnReadQuery("opportunities.match")).toBe(true);
    expect(isWriteOnReadQuery("community.visibilityRevenueSummary")).toBe(true);
  });

  test("cleanup no teardown recebe só IDs do ledger", async ({ ledger }) => {
    ledger.add("other", "fixture-1");
    ledger.setCleanupHandler("other", async entry => {
      if (entry.id !== "fixture-1") return { gone: false, detail: "id externo" };
      return { gone: true };
    });
  });

  test("cleanup failure da prova de ausência não é ok:true", async () => {
    const ledger = new TestLedger();
    ledger.add("other", "ghost");
    ledger.setCleanupHandler("other", async () => ({ gone: false, detail: "ainda presente" }));
    const result = await ledger.runCleanup();
    expect(result.ok).toBe(false);
  });
});
