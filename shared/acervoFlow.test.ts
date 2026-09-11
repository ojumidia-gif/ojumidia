import { describe, expect, it } from "vitest";
import { MAX_PHOTOS } from "./const";
import {
  acervoLinkedSummary,
  acervoSituation,
  acervoSituationLabel,
  actorCanEditPublication,
  MEDIA_IN_PUBLIC_USE_ARCHIVE_MESSAGE,
  mediaReadyToLinkEditorial,
  mediaReadyToLinkProduction,
  occupancyCopy,
} from "./acervoFlow";

describe("fluxo derivado do Acervo", () => {
  it("trata Ativo sem usos como Ainda sem conteúdo", () => {
    expect(acervoSituation({ state: "Ativo", usageCount: 0 })).toBe("ainda-sem-conteudo");
    expect(acervoSituationLabel("ainda-sem-conteudo")).toBe("Ainda sem conteúdo");
  });

  it("trata Ativo com usos como Ligada a conteúdo", () => {
    const usages = [{ kind: "publicationMedia", id: 9, label: "Noite da Malandragem", contentKind: "História" }];
    expect(acervoSituation({ state: "Ativo", usageCount: 1 })).toBe("ligada");
    expect(acervoLinkedSummary(usages)).toContain("História");
    expect(acervoLinkedSummary(usages)).not.toMatch(/orphan|órfã|storageKey/i);
  });

  it("trata Arquivado como Fora de uso e lixeira como distinta", () => {
    expect(acervoSituation({ state: "Arquivado", usageCount: 2 })).toBe("fora-de-uso");
    expect(acervoSituationLabel("fora-de-uso")).toBe("Fora de uso");
    expect(acervoSituation({ state: "Ativo", deletedAt: new Date(), usageCount: 0 })).toBe("lixeira");
  });

  it("não liga mídia arquivada, rejeitada ou sem autorização de publicação", () => {
    expect(mediaReadyToLinkEditorial({ state: "Arquivado", publicationAllowed: true, uploadStatus: "Aprovado" }).ok).toBe(false);
    expect(mediaReadyToLinkEditorial({ state: "Ativo", publicationAllowed: true, uploadStatus: "Rejeitado" }).ok).toBe(false);
    expect(mediaReadyToLinkEditorial({ state: "Ativo", publicationAllowed: false, uploadStatus: "Aprovado" }).ok).toBe(false);
    expect(mediaReadyToLinkProduction({ state: "Arquivado" }).ok).toBe(false);
    expect(mediaReadyToLinkEditorial({ state: "Ativo", publicationAllowed: true, uploadStatus: "Aprovado" }).ok).toBe(true);
  });

  it("mostra ocupação 5+1 antes do erro genérico", () => {
    expect(occupancyCopy({ mediaType: "foto", used: 4, cap: MAX_PHOTOS }).message).toBe("4 de 5 fotografias utilizadas");
    expect(occupancyCopy({ mediaType: "foto", used: 5, cap: MAX_PHOTOS }).ok).toBe(false);
    expect(occupancyCopy({ mediaType: "foto", used: 5, cap: MAX_PHOTOS }).message).toContain("limite de 5 fotografias");
  });

  it("reutiliza a mesma regra de edição editorial na UX do picker", () => {
    expect(actorCanEditPublication("administrador", "Publicada")).toBe(true);
    expect(actorCanEditPublication("criador", "Aprovada")).toBe(false);
    expect(MEDIA_IN_PUBLIC_USE_ARCHIVE_MESSAGE).toContain("conteúdo publicado");
  });
});
