import { describe, expect, it } from "vitest";
import { classifyDatabaseHost, qaMutationReadiness } from "./qaReadiness";

describe("QA readiness (sem credenciais)", () => {
  it("classifica Aiven sem expor URL", () => {
    expect(classifyDatabaseHost("mysql://u:secret@x.aivencloud.com:1234/db")).toEqual({ kind: "aiven", isAiven: true });
    expect(classifyDatabaseHost("mysql://u:secret@127.0.0.1:3306/oju_qa")).toEqual({ kind: "loopback", isAiven: false });
    expect(classifyDatabaseHost(undefined).kind).toBe("missing");
  });

  it("readiness sem flag não autoriza mutation", () => {
    const result = qaMutationReadiness({ ...process.env, E2E_ALLOW_MUTATION: undefined });
    expect(result.guard.allowed).toBe(false);
    expect(result.allowMutation).toBe(false);
  });
});
