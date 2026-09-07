import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Rede de Serviços e Saberes", () => {
  const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
  const router = readFileSync(resolve(process.cwd(), "server/routers/community.ts"), "utf8");
  const directory = readFileSync(resolve(process.cwd(), "client/src/pages/InstitutionExplorer.tsx"), "utf8");
  const editor = readFileSync(resolve(process.cwd(), "client/src/pages/admin/CommunityRecordEditDialog.tsx"), "utf8");

  it("modela o perfil comercial sem substituir a natureza institucional do diretório", () => {
    expect(schema).toContain('directoryScope: mysqlEnum("directoryScope", ["Institucional", "Serviço comunitário"])');
    expect(schema).toContain('serviceCategory: varchar("serviceCategory"');
    expect(schema).toContain('serviceKeywords: text("serviceKeywords")');
  });

  it("restringe serviços comunitários à visibilidade comercial ativa e mantém localização sob consentimento", () => {
    expect(router).toContain("publicDirectory");
    expect(router).toContain("decideCommunityHouseDirectory");
    expect(router).toContain("hasActiveInstitutionalVisibilityPlan: byInstitution.has(row.id)");
    expect(router).toContain('row.locationVisibility !== "Não divulgar"');
    expect(router).toContain('row.locationVisibility === "Pública"');
  });

  it("oferece busca pública e edição administrativa sem afirmar curadoria editorial paga", () => {
    expect(directory).toContain("Buscar na cidade");
    expect(directory).toContain("inhabitedTerritories");
    expect(directory).toContain("territoryName");
    expect(directory).not.toContain("publicTerritories.useQuery");
    expect(directory).toContain("Visibilidade contratada");
    expect(directory).toContain("não alteram a curadoria documental da Ojú");
    expect(editor).toContain("Categoria de serviço");
    expect(editor).toContain("Palavras-chave de descoberta");
  });
});
