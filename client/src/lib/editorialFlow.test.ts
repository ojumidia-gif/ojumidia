import { describe, expect, it } from "vitest";
import { communityNextStep, mediaSiteGaps, nextEditorialAction, photographerSiteGaps, publicationSiteGaps } from "./editorialFlow";

describe("próximo passo editorial", () => {
  it("não deixa criador publicar sem aprovação", () => {
    expect(nextEditorialAction("criador", "Rascunho")?.label).toBe("Enviar para revisão");
    expect(nextEditorialAction("criador", "Aprovada")).toBeNull();
    expect(nextEditorialAction("administrador", "Em revisão")?.label).toBe("Aprovar");
    expect(nextEditorialAction("administrador", "Aprovada")?.label).toBe("Publicar no site");
  });

  it("lista o que falta para o conteúdo ir ao site", () => {
    expect(publicationSiteGaps({ body: "", summary: "", teamCredit: "", media: [], taxonomies: [] }).length).toBeGreaterThan(2);
    expect(publicationSiteGaps({ body: "texto", summary: null, teamCredit: "Equipe Ojú", media: [{ isCover: true }], taxonomies: [{ dimension: "Território" }] })).toEqual([]);
  });

  it("mostra o que falta em fotógrafo, mídia e comunidade", () => {
    expect(photographerSiteGaps({ publicVisible: false, profileNote: "" })).toContain("Ainda fora de /fotografos.");
    expect(photographerSiteGaps({ publicVisible: true, profileNote: "Apresentação" })).toEqual([]);
    expect(mediaSiteGaps({ credit: "Nome", publicationAllowed: true, authorization: "Cessão", uploadStatus: "Aprovado" })).toEqual([]);
    expect(mediaSiteGaps({ credit: "", publicationAllowed: false, authorization: "Pendente", uploadStatus: "Pronto" }).length).toBeGreaterThan(2);
    expect(communityNextStep("Pendente", "Rascunho").label).toBe("Registrar consentimento");
    expect(communityNextStep("Autorizado", "Rascunho").label).toBe("Publicar no site");
    expect(communityNextStep("Autorizado", "Publicada").label).toBe("No site");
  });
});
