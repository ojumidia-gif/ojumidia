import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("serialização pública das frentes comunitárias", () => {
  const source = readFileSync(resolve(process.cwd(), "server/routers/community.ts"), "utf8");

  it("exige publicação e consentimento autorizado antes de expor instituições e agenda", () => {
    expect(source).toContain('eq(institutions.status, "Publicada")');
    expect(source).toContain('eq(institutions.consentStatus, "Autorizado")');
    expect(source).toContain('eq(communityEvents.status, "Publicada")');
    expect(source).toContain('eq(communityEvents.consentStatus, "Autorizado")');
  });

  it("protege localização, contato e memórias que não tenham acesso público", () => {
    expect(source).toContain('row.locationVisibility === "Não divulgar" ? null');
    expect(source).toContain('row.contactVisibility === "Contato institucional" ? row.contactText : null');
    expect(source).toContain('eq(oralMemories.accessLevel, "Público")');
    expect(source).toContain('eq(oralMemories.consentStatus, "Autorizado")');
  });

  it("não expõe a carteira de acolhimento em endpoint público de leitura", () => {
    expect(source).toContain("createCareRequest: publicProcedure");
    expect(source).toContain("listCareRequests: protectedProcedure");
    expect(source).not.toContain("publicCareRequests");
  });
});
