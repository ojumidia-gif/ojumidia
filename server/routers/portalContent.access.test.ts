import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canManagePortalContent } from "./portalContent";

describe("conteúdo institucional do portal", () => {
  it("permite edição, ordem, visibilidade e exclusão somente ao administrador principal", () => {
    expect(canManagePortalContent("administrador principal")).toBe(true);
    expect(canManagePortalContent("administrador")).toBe(false);
    expect(canManagePortalContent("editor")).toBe(false);
    expect(canManagePortalContent("aprovador")).toBe(false);
    expect(canManagePortalContent("criador")).toBe(false);
  });

  it("a API pública não entrega copy institucional escondida pelo F12", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers/portalContent.ts"), "utf8");
    expect(router).toContain("toPublicPortalBlocks");
    expect(router).toContain("contentJson: block.isVisible ? block.contentJson : null");
  });

  it("disponibiliza o catálogo de blocos do portal para o Super Admin editar", () => {
    const catalog = readFileSync(resolve(process.cwd(), "server/portalContentCatalog.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers/portalContent.ts"), "utf8");
    const admin = readFileSync(resolve(process.cwd(), "client/src/pages/admin/PortalContentAdmin.tsx"), "utf8");
    expect(catalog).toContain("Home");
    expect(catalog).toContain("hero");
    expect(router).toContain("ensureDefaultPortalBlocks");
    expect(admin).toContain("Editar");
    expect(admin).toContain("Excluir");
  });
});
