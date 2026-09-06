import { describe, expect, it } from "vitest";
import { classifyAdminPulse } from "./adminPulse";

describe("monitoramento de admin sem punição automática", () => {
  const now = new Date("2026-09-06T12:00:00Z");

  it("marca convite sem login e acesso parado depois de 21 dias ociosos", () => {
    expect(classifyAdminPulse({ grantStatus: "Autorizado", lastSignedIn: null, publicationCount: 0, mediaCount: 0, now }).code).toBe("convite");
    expect(classifyAdminPulse({
      grantStatus: "Autorizado",
      lastSignedIn: "2026-07-01T12:00:00Z",
      publicationCount: 0,
      mediaCount: 0,
      now,
    }).code).toBe("fantasma");
  });

  it("não chama de fantasma quem ainda produz", () => {
    expect(classifyAdminPulse({
      grantStatus: "Autorizado",
      lastSignedIn: "2026-09-01T12:00:00Z",
      publicationCount: 2,
      mediaCount: 1,
      now,
    }).code).toBe("produzindo");
    expect(classifyAdminPulse({ grantStatus: "Revogado", lastSignedIn: null, publicationCount: 0, mediaCount: 0, now }).code).toBe("revogado");
  });
});
