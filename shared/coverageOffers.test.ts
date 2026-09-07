import { describe, expect, it } from "vitest";
import { coverageMatchesTerritory, isCoverageOfferExpired, isCoverageOfferOpen } from "./coverageOffers";

describe("pedidos de cobertura na cidade", () => {
  it("liga Manaus no pedido à cidade autorizada Manaus — AM", () => {
    expect(coverageMatchesTerritory({ location: "Manaus", state: "AM" }, "Manaus — AM")).toBe(true);
    expect(coverageMatchesTerritory({ location: "Manaus", state: "Amazonas" }, "Manaus — AM")).toBe(true);
    expect(coverageMatchesTerritory({ location: "Belém", state: "PA" }, "Manaus — AM")).toBe(false);
  });

  it("some da lista se já foi aceito, se não é foto/vídeo ou se expirou", () => {
    const now = new Date("2026-09-07T15:00:00Z");
    expect(isCoverageOfferOpen({ managedByUserId: 9, status: "Solicitação", needsPhotography: true, createdAt: now }, now)).toBe(false);
    expect(isCoverageOfferOpen({ managedByUserId: null, status: "Solicitação", needsPhotography: true, createdAt: now }, now)).toBe(true);
    expect(isCoverageOfferOpen({ managedByUserId: null, status: "Solicitação", needsPhotography: false, needsVideo: false, createdAt: now }, now)).toBe(false);
    expect(isCoverageOfferExpired({ createdAt: new Date("2026-08-01T15:00:00Z") }, now)).toBe(true);
    expect(isCoverageOfferOpen({ managedByUserId: null, status: "Solicitação", needsPhotography: true, createdAt: new Date("2026-08-01T15:00:00Z") }, now)).toBe(false);
  });
});
