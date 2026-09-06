import { describe, expect, it } from "vitest";
import { portalContentDefaults } from "./portalContent";
import { siteDestinations } from "./siteDestinations";

describe("destinos públicos do portal", () => {
  it("cobre as seções públicas alimentáveis com um fluxo de criar/editar/publicar", () => {
    const nav = portalContentDefaults.Global.navigation.items.map(item => item.label);
    expect(siteDestinations.map(item => item.label)).toEqual([
      "Histórias", "Coberturas", "Documentários", "Projetos", "Fotografia documental", "Territórios", "Fotógrafos", "Instituições", "Agenda", "Memórias", "Acervo",
    ]);
    for (const dest of siteDestinations) {
      expect(nav).toContain(dest.label);
      expect(dest.how.length).toBeGreaterThan(20);
      expect(dest.adminHref.startsWith("/admin/")).toBe(true);
    }
  });
});
