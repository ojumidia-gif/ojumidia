import { describe, expect, it } from "vitest";
import { canAccessCapturedAd, canAccessOwnedCommercial, canUpdatePayout, commercialAccessPolicy, isPrincipal } from "./commercial";

describe("isolamento comercial por administração", () => {
  it("concede a visão consolidada apenas ao administrador principal", () => {
    expect(isPrincipal("administrador principal")).toBe(true);
    expect(isPrincipal("administrador")).toBe(false);
    expect(canUpdatePayout("administrador principal")).toBe(true);
    expect(canUpdatePayout("administrador")).toBe(false);
  });

  it("restringe o administrador à sua própria captação e libera o principal", () => {
    expect(canAccessCapturedAd("administrador", 10, 10)).toBe(true);
    expect(canAccessCapturedAd("administrador", 10, 11)).toBe(false);
    expect(canAccessCapturedAd("administrador principal", 10, 11)).toBe(true);
    expect(commercialAccessPolicy.canListAllAds("administrador")).toBe(false);
    expect(commercialAccessPolicy.canListAllAds("administrador principal")).toBe(true);
    expect(commercialAccessPolicy.canEditAd("administrador", 10, 11)).toBe(false);
    expect(commercialAccessPolicy.canEditAd("administrador principal", 10, 11)).toBe(true);
  });

  it("protege solicitações e contratos de outra carteira comercial", () => {
    expect(canAccessOwnedCommercial("administrador", 10, 10)).toBe(true);
    expect(canAccessOwnedCommercial("administrador", 10, 11)).toBe(false);
    expect(canAccessOwnedCommercial("administrador", 10, null)).toBe(false);
    expect(canAccessOwnedCommercial("administrador principal", 10, 11)).toBe(true);
  });
});
