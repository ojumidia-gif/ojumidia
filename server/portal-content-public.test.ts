import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("conteúdo institucional administrável", () => {
  it("conecta o método, serviços e CTAs a blocos administráveis sem remover valores seguros de fallback", () => {
    const method = readFileSync(resolve(process.cwd(), "client/src/components/OjuMethod.tsx"), "utf8");
    const services = readFileSync(resolve(process.cwd(), "client/src/pages/Services.tsx"), "utf8");
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    expect(method).toContain('usePortalContent("Global")');
    expect(services).toContain('usePortalContent("Serviços")');
    expect(home).toContain('usePortalContent("Home")');
    expect(method).toContain("sm:grid-cols-5");
  });
});
