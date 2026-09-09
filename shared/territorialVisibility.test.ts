import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canExposeOnPublicPortal } from "../server/routers/editorial";
import { publicationIdsFullyInTerritoryScope } from "../server/editorialScale";
import { productionMediaWithinLimit } from "./networkProductions";
import {
  commercialVisibilityIsNotEditorialCuration,
  decideCommunityHouseDirectory,
  decideExecutorPhotographerPage,
  decideHomeCuration,
  decidePartnerDirectory,
  decideProfessionalDirectory,
  decidePublicationPortal,
  directorySortIsAlphabetical,
  directoryTerritoryFilter,
  emptyDenied,
  futureOpportunityOriginators,
  knownOpportunityOrigins,
  mediaWindowIsPerEditorialUnitNotPerProfessional,
  opportunityIsPublicSurface,
  paymentNeverBuysEditorialOrDirectory,
  professionalMayOriginateOpportunityWithoutPublishing,
  publicationEligibleForPortal,
  sameProfessionalMayHaveMultipleMediaWindows,
  salesVolumeDoesNotRankDirectory,
} from "./territorialVisibility";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

const published = {
  status: "Publicada",
  isPublic: true,
  quarantinedAt: null,
  deletedAt: null,
  commercialRequestId: null as number | null,
  commerciallyAuthorized: true,
};

describe("Motor de visibilidade territorial — contrato sobre regras existentes", () => {
  it("1–3 conteúdo não publicado, sem autorização ou removido não entra no portal", () => {
    expect(publicationEligibleForPortal({ ...published, status: "Rascunho" })).toBe(false);
    expect(canExposeOnPublicPortal({ status: "Rascunho", isPublic: true, commercialRequestId: null, quarantinedAt: null, deletedAt: null })).toBe(false);
    expect(publicationEligibleForPortal({ ...published, commercialRequestId: 9, commerciallyAuthorized: false })).toBe(false);
    expect(canExposeOnPublicPortal({ status: "Publicada", isPublic: true, commercialRequestId: 9, quarantinedAt: null, deletedAt: null }, false)).toBe(false);
    expect(publicationEligibleForPortal({ ...published, deletedAt: new Date() })).toBe(false);
    expect(publicationEligibleForPortal({ ...published, quarantinedAt: new Date() })).toBe(false);
    expect(decidePublicationPortal(published).allowed).toBe(true);
  });

  it("4 admin fora do território não recebe ids de publicação de outro escopo", () => {
    const ids = publicationIdsFullyInTerritoryScope({
      publicationIds: [1, 2],
      territoryLinks: [{ publicationId: 1, taxonomyId: 10 }, { publicationId: 2, taxonomyId: 99 }],
      authorizedTerritoryIds: [10],
    });
    expect(ids).toEqual([1]);
    expect(source("server/networkDirectory.ts")).toContain("assertPartnerScope");
  });

  it("5–7 profissional ativo, oculto e parceiro/casa seguem elegibilidade da Rede", () => {
    expect(decideProfessionalDirectory({ status: "Ativo", publicVisible: true }).directoryEligible).toBe(true);
    expect(decideProfessionalDirectory({ status: "Ativo", publicVisible: false }).allowed).toBe(false);
    expect(decideProfessionalDirectory({ status: "Suspenso", publicVisible: true }).allowed).toBe(false);
    expect(decidePartnerDirectory({ status: "Ativo", publicVisibility: true }).allowed).toBe(true);
    expect(decidePartnerDirectory({ status: "Suspenso", publicVisibility: true }).allowed).toBe(false);
    expect(decideCommunityHouseDirectory({
      status: "Publicada",
      consentStatus: "Autorizado",
      deletedAt: null,
      directoryScope: "Institucional",
      hasActiveInstitutionalVisibilityPlan: false,
    }).allowed).toBe(true);
    expect(decideCommunityHouseDirectory({
      status: "Publicada",
      consentStatus: "Autorizado",
      deletedAt: null,
      directoryScope: "Serviço comunitário",
      hasActiveInstitutionalVisibilityPlan: false,
    }).allowed).toBe(false);
  });

  it("8 filtro territorial não expõe perfil de outro território", () => {
    expect(directoryTerritoryFilter(1, 1)).toBe(true);
    expect(directoryTerritoryFilter(2, 1)).toBe(false);
    expect(directoryTerritoryFilter(null, 1)).toBe(false);
    expect(directoryTerritoryFilter(1, null)).toBe(true);
  });

  it("9–11 Home editorial não vira comercial; pagamento não cria prioridade", () => {
    const home = decideHomeCuration({
      publication: { ...published, homePlacement: "Destaque principal", manualFeatured: false, sponsored: false },
    });
    expect(home.visibilityType).toBe("home");
    expect(home.commercialEligible).toBe(false);
    const commercialOnly = decidePublicationPortal({ ...published, commercialRequestId: 3, commerciallyAuthorized: true });
    expect(commercialOnly.editorialEligible).toBe(true);
    expect(commercialOnly.visibilityType).toBe("portal");
    expect(decideHomeCuration({
      publication: { ...published, homePlacement: "Nenhum", manualFeatured: false, sponsored: true },
    }).allowed).toBe(false);
    expect(paymentNeverBuysEditorialOrDirectory()).toBe(true);
    expect(commercialVisibilityIsNotEditorialCuration()).toBe(true);
    expect(salesVolumeDoesNotRankDirectory(999)).toBe(true);
    expect(directorySortIsAlphabetical()).toBe(true);
  });

  it("12 frequency/rotação entra no contrato sem persistência nova", () => {
    expect(emptyDenied("x").exposureCooldownUntil).toBeNull();
    expect(decideProfessionalDirectory({ status: "Ativo", publicVisible: true }).exposureCooldownUntil).toBeNull();
  });

  it("13–19 janela 5+1 é por unidade editorial, não por profissional", () => {
    expect(mediaWindowIsPerEditorialUnitNotPerProfessional().perProfessionalCap).toBeNull();
    expect(sameProfessionalMayHaveMultipleMediaWindows(3)).toBe(true);
    const a = productionMediaWithinLimit({ mediaType: "foto", attachedPhotoCount: 5, attachedVideoCount: 0 });
    const b = productionMediaWithinLimit({ mediaType: "foto", attachedPhotoCount: 0, attachedVideoCount: 0 });
    const c = productionMediaWithinLimit({ mediaType: "foto", attachedPhotoCount: 0, attachedVideoCount: 0 });
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(true);
    expect(c.ok).toBe(true);
    expect(productionMediaWithinLimit({ mediaType: "vídeo", durationSeconds: 60, attachedPhotoCount: 0, attachedVideoCount: 1 }).ok).toBe(false);
    expect(productionMediaWithinLimit({ mediaType: "vídeo", durationSeconds: 61, attachedPhotoCount: 0, attachedVideoCount: 0 }).ok).toBe(false);
  });

  it("20 anexos de produção e publicação passam pelo backend, não só pelo frontend", () => {
    expect(source("server/productions.ts")).toContain("productionMediaWithinLimit");
    expect(source("server/routers/editorial.ts")).toContain("canAttachWithinMediaLimit");
    expect(source("server/routers/media.ts")).toContain("durationSeconds");
    expect(source("server/routers/editorial.ts")).toContain("publicationEligibleForPortal");
  });

  it("oportunidade permanece privada; originação profissional ainda não tem coluna", () => {
    expect(opportunityIsPublicSurface()).toBe(false);
    expect(knownOpportunityOrigins).toEqual(["Comercial", "Mesa", "Manual"]);
    expect(futureOpportunityOriginators).toContain("profissional");
    expect(professionalMayOriginateOpportunityWithoutPublishing()).toBe(true);
    expect(source("drizzle/schema.ts")).not.toContain("originatedByProfessionalId");
    expect(source("drizzle/schema.ts")).not.toContain("originatedByProfessionalProfileId");
  });

  it("preserva as duas superfícies públicas de profissional sem fundi-las", () => {
    expect(decideExecutorPhotographerPage({ publicVisible: true, publicSlug: "ana" }).allowed).toBe(true);
    expect(source("server/routers/editorial.ts")).toContain("publicPhotographers");
    expect(source("server/routers/editorial.ts")).toContain("decideExecutorPhotographerPage");
    expect(source("server/networkDirectory.ts")).toContain("professionalProfiles");
  });
});
