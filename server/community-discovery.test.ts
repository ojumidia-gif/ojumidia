import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("descoberta comunitária com privacidade", () => {
  const router = readFileSync(resolve(process.cwd(), "server/routers/community.ts"), "utf8");
  const memories = readFileSync(resolve(process.cwd(), "client/src/pages/OralMemorySearch.tsx"), "utf8");
  const tracking = readFileSync(resolve(process.cwd(), "client/src/pages/CareTracking.tsx"), "utf8");
  const map = readFileSync(resolve(process.cwd(), "client/src/pages/InstitutionExplorer.tsx"), "utf8");

  it("filtra memórias públicas por palavra, tema e território sem incluir acessos protegidos", () => {
    expect(router).toContain("publicMemories: publicProcedure.input");
    expect(router).toContain("eq(oralMemories.accessLevel, \"Público\")");
    expect(router).toContain("row.theme");
    expect(memories).toContain('placeholder="Ex.: ancestralidade"');
    expect(memories).toContain("Cidade");
  });

  it("retorna no acompanhamento somente status e atualização associados ao protocolo", () => {
    expect(router).toContain("trackingCode = `AC-");
    expect(router).toContain("trackCareRequest: publicProcedure");
    expect(router).toContain("status: communityCareRequests.status");
    expect(tracking).toContain("Esta consulta mostra somente a etapa atual");
  });

  it("inclui no mapa apenas instituições com localização pública e coordenadas autorizadas", () => {
    expect(router).toContain('eq(institutions.locationVisibility, "Pública")');
    expect(router).toContain("isNotNull(institutions.latitude)");
    expect(router).toContain("communityHouseIsPubliclyListed(row, byInstitution.has(row.id))");
    expect(map).toContain("publicDirectory.useQuery");
    expect(map).toContain("Registros com localização aproximada ou não divulgada continuam protegidos");
  });
});
