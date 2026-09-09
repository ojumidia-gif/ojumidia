import { describe, expect, it } from "vitest";
import { createTestRunId, evaluateMutationGuard, parseDatabaseHost, storagePrefixForRun } from "./envGuard";

const safe = {
  allowMutation: "1",
  baseURL: "http://127.0.0.1:3100",
  databaseUrl: "mysql://qa:secret@127.0.0.1:3307/oju_midia_qa",
  allowedDatabaseHosts: "127.0.0.1",
  expectedDatabaseName: "oju_midia_qa",
  expectedDatabasePort: "3307",
} as const;

describe("QA-AUTO environment guard", () => {
  it("baseURL de produção aborta", () => {
    const result = evaluateMutationGuard({ ...safe, baseURL: "https://ojumidia.com.br" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/produção|pública/i);
  });

  it("www e Render de produção abortam", () => {
    expect(evaluateMutationGuard({ ...safe, baseURL: "https://www.ojumidia.com.br" }).allowed).toBe(false);
    expect(evaluateMutationGuard({ ...safe, baseURL: "https://ojumidia.onrender.com" }).allowed).toBe(false);
  });

  it("localhost sem E2E_ALLOW_MUTATION aborta", () => {
    const result = evaluateMutationGuard({ ...safe, allowMutation: undefined });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/E2E_ALLOW_MUTATION/);
  });

  it("E2E_ALLOW_MUTATION=1 não basta com Aiven", () => {
    const result = evaluateMutationGuard({
      ...safe,
      databaseUrl: "mysql://u:p@mysql-xxx.aivencloud.com:12345/defaultdb",
      allowedDatabaseHosts: "mysql-xxx.aivencloud.com",
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toMatch(/Aiven/);
  });

  it("DATABASE_URL desconhecido aborta mesmo com allow mutation", () => {
    const result = evaluateMutationGuard({
      ...safe,
      databaseUrl: "mysql://u:p@db.example.com:3306/app",
      allowedDatabaseHosts: "127.0.0.1",
    });
    expect(result.allowed).toBe(false);
  });

  it("allowlist vazia aborta", () => {
    const result = evaluateMutationGuard({ ...safe, allowedDatabaseHosts: "" });
    expect(result.allowed).toBe(false);
  });

  it("ambiente loopback + allowlist + flag permite", () => {
    const result = evaluateMutationGuard(safe);
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.runId).toMatch(/^QA-AUTO-\d+-[a-z0-9]+$/);
      expect(result.storagePrefix).toBe(storagePrefixForRun(result.runId));
    }
  });

  it("database oju_midia (dev) aborta", () => {
    const result = evaluateMutationGuard({
      ...safe,
      databaseUrl: "mysql://oju_local:x@127.0.0.1:3306/oju_midia",
      expectedDatabaseName: "oju_midia_qa",
    });
    expect(result.allowed).toBe(false);
  });

  it("porta 3306 aborta quando E2E_DATABASE_PORT=3307", () => {
    const result = evaluateMutationGuard({
      ...safe,
      databaseUrl: "mysql://oju_qa:x@127.0.0.1:3306/oju_midia_qa",
    });
    expect(result.allowed).toBe(false);
  });

  it("mídia mutante sem storage isolado aborta", () => {
    const result = evaluateMutationGuard({ ...safe, mediaMutation: true, storageIsolated: undefined });
    expect(result.allowed).toBe(false);
  });

  it("mídia mutante com storage isolado e prefixo permite", () => {
    const result = evaluateMutationGuard({
      ...safe,
      mediaMutation: true,
      storageIsolated: "1",
      storagePrefix: "qa-auto/run/",
    });
    expect(result.allowed).toBe(true);
  });

  it("parseDatabaseHost não inclui senha", () => {
    expect(parseDatabaseHost("mysql://user:super-secret@127.0.0.1:3306/db")).toBe("127.0.0.1");
  });

  it("test run ids não se repetem", () => {
    expect(createTestRunId(1, "aaa")).not.toBe(createTestRunId(2, "bbb"));
  });
});
