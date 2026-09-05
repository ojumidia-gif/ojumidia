import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("navegação pública cinematográfica", () => {
  it("expõe a arquitetura documental aprovada no cabeçalho e preserva a descoberta editorial no roteador", () => {
    const header = readFileSync(resolve(process.cwd(), "client/src/components/PublicHeader.tsx"), "utf8");
    const architecture = readFileSync(resolve(process.cwd(), "client/src/lib/publicArchitecture.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const portal = readFileSync(resolve(process.cwd(), "client/src/lib/portalContent.ts"), "utf8");
    expect(header).toContain('usePortalContent("Global")');
    ["Histórias", "Memórias documentais", "Serviços", "Comunidade", "Sobre"].forEach(label => expect(architecture).toContain(`label: "${label}"`));
    expect(portal).toContain("Planejar um registro");
    expect(header).toContain("item.active !== false");
    ["/historias", "/coberturas", "/documentarios", "/projetos", "/territorios", "/fotografos", "/instituicoes", "/agenda", "/memorias", "/acervo"].forEach(path => expect(router).toContain(`path={"${path}"}`));
    expect(router).toContain('path={"/admin/fotografos"}'); expect(router).toContain('path={"/admin/territorios"}');
  });
});
