import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_MINICLIPS, MAX_PHOTOS } from "@shared/const";

describe("campo de link externo no CMS e no portal", () => {
  it("mostra Produção completa no rascunho, com URL e texto do botão opcional", () => {
    const form = readFileSync(resolve(process.cwd(), "client/src/pages/admin/PublicationEdit.tsx"), "utf8");
    expect(form).toContain('id="link-externo"');
    expect(form).toContain("Produção completa");
    expect(form).toContain("Texto do botão");
    expect(form).toContain("placeholder=\"https://...\"");
    expect(form).toContain("externalAlbumLabel");
    expect(form).toContain("Se preenchido, este texto será usado no botão público");
    expect(form).not.toContain("até 5 fotos e 2 vídeos curtos");
    expect(form).toContain("MAX_PHOTOS");
    expect(form).toContain("MAX_MINICLIPS");
    expect(MAX_PHOTOS).toBe(5);
    expect(MAX_MINICLIPS).toBe(1);
  });

  it("renderiza a produção completa só na leitura pública, sem player/iframe externo e sem CTA na Home", () => {
    const story = readFileSync(resolve(process.cwd(), "client/src/pages/Story.tsx"), "utf8");
    const memories = readFileSync(resolve(process.cwd(), "client/src/pages/DocumentaryMemories.tsx"), "utf8");
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const card = readFileSync(resolve(process.cwd(), "client/src/components/PublicCoverCard.tsx"), "utf8");
    expect(story).toContain("CompleteProductionLinks");
    expect(story).toContain("data.completeProductions");
    expect(story).not.toContain("iframe");
    expect(memories).not.toContain("externalVideoUrl");
    expect(home).not.toContain("completeProductions");
    expect(card).not.toContain("completeProductions");
  });

  it("valida URL e label no update, com fallback só no serializer compartilhado", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers/editorial.ts"), "utf8");
    const helper = readFileSync(resolve(process.cwd(), "shared/externalPublicationLink.ts"), "utf8");
    expect(router).toContain("parseStoredExternalHttpUrl");
    expect(router).toContain("parseStoredExternalLabel");
    expect(router).toContain("completeProductions");
    expect(router).toContain("assertPublicationScope");
    expect(router).toContain("canEditPublication");
    expect(helper).toContain("resolveCompleteProductionLabel");
    expect(readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8")).toContain("externalAlbumLabel");
    expect(readFileSync(resolve(process.cwd(), "drizzle/0057_publication_external_labels.sql"), "utf8")).toContain("externalAlbumLabel");
  });
});
