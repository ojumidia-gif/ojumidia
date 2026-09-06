import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ingresso administrativo reservado", () => {
  it("exige cinco toques rápidos na marca do rodapé e não exibe um atalho público", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const footer = readFileSync(resolve(process.cwd(), "client/src/components/PublicFooter.tsx"), "utf8");
    expect(home).toContain("if (next >= 5)");
    expect(home).toContain('setLocation("/admin")');
    expect(home).toContain("onBrandClick={signalAdminEntry}");
    expect(footer).toContain("FooterMark onClick={onBrandClick}");
    expect(footer).toContain("public-footer-nav");
    expect(footer).toContain("flex-col items-center");
    expect(home).not.toContain("Área administrativa");
  });
});
