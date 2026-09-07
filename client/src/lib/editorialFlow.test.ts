import { describe, expect, it } from "vitest";
import { communityNextStep, mediaSiteGaps, nextEditorialAction, photographerSiteGaps, publicationSiteGaps, publishWizardStep } from "./editorialFlow";

describe("próximo passo editorial", () => {
  it("admin publica direto; criador só pede revisão", () => {
    expect(nextEditorialAction("criador", "Rascunho")?.label).toBe("Pedir revisão");
    expect(nextEditorialAction("criador", "Aprovada")).toBeNull();
    expect(nextEditorialAction("administrador", "Rascunho")?.label).toBe("Publicar no site");
    expect(nextEditorialAction("administrador", "Em revisão")?.label).toBe("Publicar no site");
    expect(nextEditorialAction("administrador", "Aprovada")?.label).toBe("Publicar no site");
    expect(nextEditorialAction("administrador principal", "Rascunho")?.label).toBe("Publicar no site");
  });

  it("lista só o mínimo para o conteúdo ir ao site", () => {
    expect(publicationSiteGaps({ body: "", summary: "", media: [], taxonomies: [] }).length).toBe(3);
    expect(publicationSiteGaps({ body: "texto", summary: null, media: [{ isCover: true }], taxonomies: [{ dimension: "Território" }] })).toEqual([]);
    expect(publishWizardStep(["Falta o texto que o site vai ler."])).toBe(1);
    expect(publishWizardStep(["Ligue a uma cidade de atuação."])).toBe(2);
    expect(publishWizardStep([])).toBe(3);
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
