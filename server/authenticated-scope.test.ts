import { describe, expect, it } from "vitest";
import { canAccessCentralPublication, decideAuthenticatedScope } from "./partnerScope";

describe("isolamento territorial autenticado", () => {
  it("permite ao Super Admin operar com ou sem parceiro", () => {
    expect(decideAuthenticatedScope({
      isPrincipal: true,
      membershipPartnerIds: [],
      authorizedTerritoryIds: [],
      requestedPartnerId: null,
      requestedTerritoryId: null,
      resourceLabel: "este upload",
    })).toEqual({ partnerId: null, territoryId: null, scope: "global" });
  });

  it("impede o Admin RS de assumir o território AM mesmo se o frontend enviar o id", () => {
    expect(() => decideAuthenticatedScope({
      isPrincipal: false,
      membershipPartnerIds: [10],
      authorizedTerritoryIds: [100],
      requestedPartnerId: 20,
      requestedTerritoryId: 200,
      resourceLabel: "este upload",
    })).toThrow(/não possui escopo ativo/);
  });

  it("preenche automaticamente o único território autorizado do parceiro", () => {
    expect(decideAuthenticatedScope({
      isPrincipal: false,
      membershipPartnerIds: [10],
      authorizedTerritoryIds: [100],
      requestedPartnerId: null,
      requestedTerritoryId: null,
      resourceLabel: "este upload",
    })).toEqual({ partnerId: 10, territoryId: 100, scope: "partner" });
  });

  it("impede Admin de parceiro de ler publicação nacional sem partnerId", () => {
    expect(canAccessCentralPublication(true, true, null)).toBe(true);
    expect(canAccessCentralPublication(false, true, null)).toBe(false);
    expect(canAccessCentralPublication(false, false, null)).toBe(true);
    expect(canAccessCentralPublication(false, true, 10)).toBe(true);
  });

  it("rejeita território fora da carteira autorizada", () => {
    expect(() => decideAuthenticatedScope({
      isPrincipal: false,
      membershipPartnerIds: [10],
      authorizedTerritoryIds: [100],
      requestedPartnerId: 10,
      requestedTerritoryId: 200,
      resourceLabel: "este upload",
    })).toThrow(/não pertence ao escopo autorizado/);
  });
});
