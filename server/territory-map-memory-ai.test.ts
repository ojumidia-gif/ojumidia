import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("territórios, mapa e memória assistida", () => {
  const editorial = readFileSync(resolve(process.cwd(), "server/routers/editorial.ts"), "utf8");
  const community = readFileSync(resolve(process.cwd(), "server/routers/community.ts"), "utf8");
  const taxonomyAdmin = readFileSync(resolve(process.cwd(), "client/src/pages/admin/TaxonomiesAdmin.tsx"), "utf8");
  const map = readFileSync(resolve(process.cwd(), "client/src/pages/InstitutionExplorer.tsx"), "utf8");
  const memoryForm = readFileSync(resolve(process.cwd(), "client/src/pages/admin/OralMemoryUploadAdmin.tsx"), "utf8");

  it("mantém as coordenadas territoriais condicionadas à visibilidade escolhida", () => {
    expect(editorial).toContain("mapVisibility");
    expect(taxonomyAdmin).toContain("Referência no mapa");
    expect(taxonomyAdmin).toContain("mapVisibility === \"Pública\"");
  });

  it("agrupa marcadores e diferencia os tipos de instituições", () => {
    expect(map).toContain("groupPoints");
    expect(map).toContain("iconByType");
    expect(map).toContain("marcadores agrupados");
  });

  it("transcreve e resume somente memórias autorizadas, para revisão humana", () => {
    expect(community).toContain("generateMemoryAssistance");
    expect(community).toContain("transcribeAudio");
    expect(community).toContain("memory.consentStatus !== \"Autorizado\"");
    expect(community).toContain("generatedTranscript");
    expect(memoryForm).toContain("generateAssistance.mutateAsync");
  });
});
