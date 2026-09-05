import { describe, expect, it } from "vitest";
import { isPrincipalOnlyAdminPath, visibleAdminNav } from "./adminNav";

describe("rotas administrativas restritas ao Super Admin", () => {
  it("esconde curadoria nacional do Admin comum e bloqueia a URL direta", () => {
    const labels = visibleAdminNav("administrador").flatMap(group => group.items.map(item => item.href));
    expect(labels).toContain("/admin/publicacoes");
    expect(labels).toContain("/admin/territorios");
    expect(labels).toContain("/admin/fotografos");
    expect(labels).toContain("/admin/midias");
    expect(labels).not.toContain("/admin/conteudo-portal");
    expect(labels).not.toContain("/admin/retencao");
    expect(labels).not.toContain("/admin/auditoria");
    expect(isPrincipalOnlyAdminPath("/admin/auditoria")).toBe(true);
    expect(isPrincipalOnlyAdminPath("/admin/anuncios/12")).toBe(true);
    expect(isPrincipalOnlyAdminPath("/admin/destaques")).toBe(true);
    expect(isPrincipalOnlyAdminPath("/admin/home-preview/12")).toBe(true);
    expect(isPrincipalOnlyAdminPath("/admin/publicacoes")).toBe(false);
  });
});
