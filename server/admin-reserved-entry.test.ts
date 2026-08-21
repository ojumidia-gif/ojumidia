import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ingresso administrativo reservado", () => {
  it("exige cinco toques rápidos na marca do rodapé e não exibe um atalho público", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    expect(home).toContain("if (next >= 5)");
    expect(home).toContain('setLocation("/admin")');
    expect(home).toContain("<OjuMark compact cinematic onClick={signalAdminEntry} />");
    expect(home).not.toContain("Área administrativa");
  });
});
