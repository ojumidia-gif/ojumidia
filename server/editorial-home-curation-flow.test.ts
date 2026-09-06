import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("fluxo de lugar, capa e Home", () => {
  it("permite cadastrar localização com endereço no editor, sem copiar o texto de Territórios nas outras dimensões", () => {
    const panel = source("client/src/pages/admin/CoverageTaxonomiesPanel.tsx");
    expect(panel).toContain("Cadastrar e ligar");
    expect(panel).toContain("Endereço, bairro ou referência autorizada");
    expect(panel).toContain("ensureGoogleMaps");
    expect(panel).toContain("Digite o lugar, o bairro ou o endereço autorizado.");
    expect(panel).toContain("Cadastre a casa, o coletivo ou a organização desta história.");
    expect(panel).not.toContain("Cadastre itens em Territórios.");
  });

  it("separa publicar no portal de aparecer em Histórias recentes e usa capa autorizada", () => {
    const edit = source("client/src/pages/admin/PublicationEdit.tsx");
    const list = source("client/src/pages/admin/PublicationsAdmin.tsx");
    const highlights = source("client/src/pages/admin/HighlightsAdmin.tsx");
    const editorial = source("server/routers/editorial.ts");
    expect(edit).not.toContain('contentKind !== "Fotografia documental"');
    expect(edit).toContain("CoverageTaxonomiesPanel");
    expect(edit).toContain("setFeatured");
    expect(edit).toContain("suggestHighlight");
    expect(list).toContain(">Editar</Link>");
    expect(list).not.toContain(">Continuar</Link>");
    expect(highlights).toContain("Mostrar em Histórias recentes");
    expect(highlights).toContain("coverUrl");
    expect(editorial).toContain("createdByMe");
    expect(list).toContain("Só os meus");
    expect(editorial).toContain('eq(mediaAssets.publicationAllowed, true)');
  });
});
