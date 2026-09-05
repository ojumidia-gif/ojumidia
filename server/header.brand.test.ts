import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("marca do cabeçalho público", () => {
  it("usa somente a imagem de marca fornecida e não replica Ojú Mídia em texto", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/components/PublicHeader.tsx"), "utf8");
    expect(source).toContain('"/oju-assets/oju-midia-marca.png"');
    expect(source).not.toContain("/manus-storage/oju-midia-marca");
    expect(source).not.toContain('<span className="font-serif text-lg');
    expect(source).toContain('h-12 w-40');
    expect(source).toContain('object-contain object-center');
  });
});
