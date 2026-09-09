import { describe, expect, it } from "vitest";
import { assertReadSafeProcedure, isWriteOnReadQuery, WRITE_ON_READ_QUERIES } from "./writeOnRead";

describe("write-on-read denylist", () => {
  it("contém as 8 queries identificadas", () => {
    expect(WRITE_ON_READ_QUERIES).toHaveLength(8);
    expect(isWriteOnReadQuery("opportunities.list")).toBe(true);
    expect(isWriteOnReadQuery("community.publicDirectory")).toBe(true);
    expect(isWriteOnReadQuery("editorial.publicHome")).toBe(false);
    expect(isWriteOnReadQuery("networkDirectory.publicList")).toBe(false);
  });

  it("não trata denylist como read-only", () => {
    expect(() => assertReadSafeProcedure("opportunities.list")).toThrow(/denylist/);
    expect(() => assertReadSafeProcedure("opportunities.list", "auth-probe")).not.toThrow();
    expect(() => assertReadSafeProcedure("editorial.publicHome")).not.toThrow();
  });
});
