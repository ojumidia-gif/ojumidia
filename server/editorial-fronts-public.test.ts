import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("frentes públicas editoriais", () => {
  it("preserva rotas próprias para Coberturas, Documentários e Projetos como aprofundamentos do acervo", () => {
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const header = readFileSync(resolve(process.cwd(), "client/src/components/PublicHeader.tsx"), "utf8");
    ["/coberturas", "/documentarios", "/projetos"].forEach(route => expect(app).toContain(`path={"${route}"}`));
    expect(header).toContain('usePortalContent("Global")');
    expect(readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8")).toContain('aria-label={action}');
  });

  it("mantém a página de território por slug em apresentação documental própria", () => {
    const taxonomy = readFileSync(resolve(process.cwd(), "client/src/pages/Taxonomy.tsx"), "utf8");
    expect(taxonomy).toContain('useRoute("/territorios/:slug")');
    expect(taxonomy).toContain("Cidade de atuação");
    expect(taxonomy).toContain("trpc.editorial.search.useQuery");
  });

  it("conecta a listagem de Territórios e o Acervo a consultas públicas reais", () => {
    const territories = readFileSync(resolve(process.cwd(), "client/src/pages/TerritoriesPreview.tsx"), "utf8");
    const archive = readFileSync(resolve(process.cwd(), "client/src/pages/ArchivePreview.tsx"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers/editorial.ts"), "utf8");
    expect(territories).toContain("trpc.editorial.publicTerritories.useQuery");
    expect(territories).toContain("useEditorialLive");
    expect(territories).not.toContain("PublicSectionHierarchyPreview");
    expect(archive).toContain('import Search from "./Search"');
    expect(router).toContain("publicTerritories: publicProcedure");
  });

  it("não recarrega o portal público quando o SSE editorial recusa visitante", () => {
    const live = readFileSync(resolve(process.cwd(), "client/src/hooks/useEditorialLive.ts"), "utf8");
    expect(live).not.toContain("window.location.reload(");
    expect(live).toContain("EDITORIAL_LIVE_ROLES");
    expect(live).toContain("canSubscribe");
  });
});
