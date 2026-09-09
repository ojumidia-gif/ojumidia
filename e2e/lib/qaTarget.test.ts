import { describe, expect, it } from "vitest";
import { assertQaMysqlTarget, parseMysqlUrl } from "./qaTarget";

describe("QA MySQL target", () => {
  it("aceita somente 127.0.0.1:3307/oju_midia_qa", () => {
    const result = assertQaMysqlTarget("mysql://oju_qa:secret@127.0.0.1:3307/oju_midia_qa");
    expect(result.ok).toBe(true);
  });

  it("bloqueia Aiven", () => {
    const result = assertQaMysqlTarget("mysql://u:p@mysql-x.aivencloud.com:12345/defaultdb");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Aiven/);
  });

  it("bloqueia banco de desenvolvimento oju_midia", () => {
    const result = assertQaMysqlTarget("mysql://oju_local:x@127.0.0.1:3306/oju_midia");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/desenvolvimento/);
  });

  it("bloqueia porta 3306", () => {
    const result = assertQaMysqlTarget("mysql://oju_qa:x@127.0.0.1:3306/oju_midia_qa");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/3307/);
  });

  it("parseMysqlUrl não devolve senha", () => {
    expect(parseMysqlUrl("mysql://user:super-secret@127.0.0.1:3307/oju_midia_qa")).toEqual({
      host: "127.0.0.1",
      port: "3307",
      database: "oju_midia_qa",
    });
  });
});
