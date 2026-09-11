import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canAttachWithinMediaLimit } from "./routers/editorial";
import { MEDIA_IN_PUBLIC_USE_ARCHIVE_MESSAGE } from "@shared/acervoFlow";
import { productionMediaWithinLimit } from "@shared/networkProductions";
import { MAX_MINICLIPS, MAX_PHOTOS } from "@shared/const";

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

describe("fluxo de domínio do Acervo", () => {
  const mediaRouter = read("server/routers/media.ts");
  const lifecycle = read("server/mediaLifecycle.ts");
  const editorial = read("server/routers/editorial.ts");
  const productions = read("server/productions.ts");
  const acervo = read("client/src/pages/admin/MediaAdmin.tsx");
  const linker = read("client/src/components/MediaAcervoLinkDialog.tsx");
  const docs = read("docs/FLUXO_ACERVO_OJU.md");

  it("mostra estados derivados sem criar coluna linked", () => {
    const flow = read("shared/acervoFlow.ts");
    expect(flow).toContain("Ainda sem conteúdo");
    expect(flow).toContain("Fora de uso");
    expect(acervo).toContain("acervoSituationLabel");
    expect(acervo).toContain("Ligar a um conteúdo");
    expect(acervo).toContain("Retirar de uso");
    expect(acervo).toContain("Enviar à lixeira");
    expect(acervo).toContain("Editar dados");
    expect(acervo).toContain("Reativar");
    expect(acervo).not.toMatch(/\borphan\b|\bórfã\b|\bsem dono\b/i);
    expect(mediaRouter).not.toContain("linked:");
    expect(docs).toContain("O vínculo não é um estado da mídia. O vínculo é uma relação derivada dos objetos que utilizam a mídia.");
  });

  it("editar dados não cria vínculo nem altera storage", () => {
    expect(mediaRouter).toMatch(/update:[\s\S]{0,400}origin:/);
    expect(mediaRouter).not.toMatch(/update:[\s\S]{0,800}storageKey:/);
    expect(mediaRouter).not.toMatch(/update:[\s\S]{0,800}uploadId:/);
    expect(mediaRouter).not.toMatch(/update:[\s\S]{0,1200}insert\(publicationMedia\)/);
    expect(acervo).toContain("Não cria vínculo, não publica");
  });

  it("ligar reutiliza attach existente e o picker é só UX", () => {
    expect(linker).toContain("editorial.attachMedia");
    expect(linker).toContain("productions.attachMedia");
    expect(linker).toContain("actorCanEditPublication");
    expect(editorial).toContain("assertPublicationScope");
    expect(editorial).toContain("canEditPublication");
    expect(editorial).toContain("canAttachWithinMediaLimit");
    expect(editorial).toContain("canAccessOwnOperatorRecord");
    expect(productions).toContain("decideProductionMediaAttachAccess");
    expect(productions).toContain("assertPartnerScope");
    expect(productions).toContain("productionMediaWithinLimit");
  });

  it("preserva 5+1 e bloqueia a 6ª fotografia", () => {
    expect(canAttachWithinMediaLimit({ contentKind: "História", mediaType: "foto", photoLimit: 5, videoLimit: 1, attachedPhotoCount: 4, attachedVideoCount: 0 })).toBe(true);
    expect(canAttachWithinMediaLimit({ contentKind: "História", mediaType: "foto", photoLimit: 5, videoLimit: 1, attachedPhotoCount: 5, attachedVideoCount: 0 })).toBe(false);
    expect(productionMediaWithinLimit({ mediaType: "foto", attachedPhotoCount: 5, attachedVideoCount: 0 }).ok).toBe(false);
    expect(productionMediaWithinLimit({ mediaType: "vídeo", durationSeconds: 61, attachedPhotoCount: 0, attachedVideoCount: 0 }).ok).toBe(false);
    expect(MAX_PHOTOS).toBe(5);
    expect(MAX_MINICLIPS).toBe(1);
    expect(linker).toContain("occupancyCopy");
  });

  it("retirar de uso bloqueia conteúdo público e não se mistura com lixeira", () => {
    expect(mediaRouter).toContain("canPubliclyReleaseMedia");
    expect(mediaRouter).toContain("MEDIA_IN_PUBLIC_USE_ARCHIVE_MESSAGE");
    expect(MEDIA_IN_PUBLIC_USE_ARCHIVE_MESSAGE).toContain("conteúdo publicado");
    expect(acervo).toContain("Retirar de uso");
    expect(acervo).toContain("Enviar à lixeira");
    expect(mediaRouter).toContain("restoreMediaIfRecoverable");
    expect(read("server/mediaLifecycle.ts")).toContain('state: "Arquivado"');
  });

  it("purge consulta networkProductionMedia e usos do Acervo", () => {
    expect(lifecycle).toContain("networkProductionMedia");
    expect(lifecycle).toContain("collectMediaUsagesByIds");
    expect(mediaRouter).toContain("usages:");
    expect(mediaRouter).toContain("collectMediaUsagesByIds");
    expect(acervo).toContain("Consultar usos");
  });

  it("não confunde /admin/midias com /acervo público", () => {
    expect(acervo).toContain("href=\"/acervo\"");
    expect(acervo).toContain("Acervo interno");
    expect(read("client/src/pages/Search.tsx")).toContain("não é o Acervo interno");
  });
});
