import { describe, expect, it } from "vitest";
import { partnerShareFromPolicy } from "./financialGovernance";
import { sanitizePublicNavigation } from "./publicNavPolicy";
import { authorizedTerritoryIdsForMembership, canAccessCentralPublication, decideAuthenticatedScope } from "./partnerScope";
import { canAdvanceStatus } from "./editorialPolicy";

describe("lacunas Admin/CMS — política, território e privilégio", () => {
  it("calcula a parcela Ojú a partir da política persistida, sem número mágico 0.95", () => {
    expect(partnerShareFromPolicy(1000, 5)).toEqual({ ojuAmount: 50, partnerNet: 950, ojuPercent: 5 });
    expect(partnerShareFromPolicy(1000, 10)).toEqual({ ojuAmount: 100, partnerNet: 900, ojuPercent: 10 });
    expect(partnerShareFromPolicy(200, 20)).toEqual({ ojuAmount: 40, partnerNet: 160, ojuPercent: 20 });
  });

  it("impede Admin A de Porto Alegre de usar território/parceiro de Admin B em Manaus", () => {
    expect(() => decideAuthenticatedScope({
      isPrincipal: false,
      membershipPartnerIds: [1],
      authorizedTerritoryIds: [10],
      requestedPartnerId: 2,
      requestedTerritoryId: 20,
      resourceLabel: "esta publicação",
    })).toThrow(/não possui escopo ativo/);
    expect(canAccessCentralPublication(false, true, 2)).toBe(true);
    expect(canAccessCentralPublication(false, true, null)).toBe(false);
    expect(authorizedTerritoryIdsForMembership(10, [10, 11])).toEqual([10]);
    expect(authorizedTerritoryIdsForMembership(20, [10, 11])).toEqual([]);
  });

  it("permite Super Admin global e recusa escalada editorial de criador para publicar", () => {
    expect(decideAuthenticatedScope({
      isPrincipal: true,
      membershipPartnerIds: [],
      authorizedTerritoryIds: [],
      requestedPartnerId: 2,
      requestedTerritoryId: 20,
      resourceLabel: "esta publicação",
    })).toEqual({ partnerId: 2, territoryId: 20, scope: "global" });
    expect(canAdvanceStatus("criador", "Aprovada")).toBe(false);
    expect(canAdvanceStatus("administrador", "Aprovada")).toBe(true);
    expect(canAdvanceStatus("aprovador", "Aprovada")).toBe(false);
  });

  it("aceita somente destinos públicos existentes na navegação CMS", () => {
    const json = sanitizePublicNavigation(JSON.stringify({
      items: [{ label: "Histórias", href: "/historias", order: 1, active: true, featured: true }],
    }));
    expect(JSON.parse(json).items[0].href).toBe("/historias");
    expect(() => sanitizePublicNavigation(JSON.stringify({ items: [{ label: "Painel secreto", href: "/admin/secret" }] }))).toThrow(/não é uma rota pública/);
  });
});
