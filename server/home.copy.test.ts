import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("chamada editorial da Home", () => {
  it("apresenta a abertura cinematográfica e mantém Jornalismo documental fora do hero", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const content = readFileSync(resolve(process.cwd(), "client/src/lib/portalContent.ts"), "utf8");
    expect(source).toContain('usePortalContent("Home")');
    expect(content).toContain("Memórias que conectam gerações");
    expect(source).not.toContain(">Jornalismo documental<");
  });
});
