import { describe, expect, it } from "vitest";
import { canExposeOnPublicPortal, requiresCommercialEditorialAuthorization, toPortalPublication } from "./editorial";

describe("proteção pública de Coberturas contratadas", () => {
  const publishedEditorial = { status: "Publicada" as const, isPublic: true, commercialRequestId: null };
  const publishedCommercial = { status: "Publicada" as const, isPublic: true, commercialRequestId: 91 };
  const authorizedForPortal = { status: "Autorizada" as const, allowPhotos: true, allowVideos: false, allowOrganizationName: false, allowLocation: false, allowStory: true, allowPeopleIdentification: false, allowPortal: true, allowInstitutional: false, allowSocial: false, authorizedAt: new Date("2026-08-19"), expiresAt: null, revokedAt: null };

  it("mantém material editorial independente elegível ao portal", () => {
    expect(requiresCommercialEditorialAuthorization(publishedEditorial)).toBe(false);
    expect(canExposeOnPublicPortal(publishedEditorial)).toBe(true);
  });

  it("bloqueia material contratado sem autorização editorial", () => {
    expect(requiresCommercialEditorialAuthorization(publishedCommercial)).toBe(true);
    expect(canExposeOnPublicPortal(publishedCommercial, false)).toBe(false);
    expect(canExposeOnPublicPortal(publishedCommercial, null)).toBe(false);
  });

  it("libera material contratado somente com autorização vigente e escopo de portal", () => {
    expect(canExposeOnPublicPortal(publishedCommercial, authorizedForPortal)).toBe(true);
    expect(canExposeOnPublicPortal(publishedCommercial, { ...authorizedForPortal, allowPortal: false })).toBe(false);
    expect(canExposeOnPublicPortal(publishedCommercial, { ...authorizedForPortal, expiresAt: new Date("2020-01-01") })).toBe(false);
    expect(canExposeOnPublicPortal(publishedCommercial, { ...authorizedForPortal, status: "Revogada", revokedAt: new Date() })).toBe(false);
  });

  it("mantém conteúdo despublicado fora do portal mesmo se autorizado", () => {
    expect(canExposeOnPublicPortal({ ...publishedCommercial, isPublic: false }, authorizedForPortal)).toBe(false);
  });

  it("mantém rascunhos fora do portal mesmo sem vínculo comercial", () => {
    expect(canExposeOnPublicPortal({ ...publishedEditorial, status: "Rascunho" }, authorizedForPortal)).toBe(false);
  });

  it("remove o identificador comercial privado do objeto preparado para o portal", () => {
    const portalPayload = toPortalPublication({ ...publishedCommercial, id: 12, title: "Cobertura", slug: "cobertura", contentKind: "Cobertura", subtitle: null, summary: null, body: null, teamId: null, createdBy: 1, editedBy: null, approvedBy: null, createdAt: new Date(), updatedAt: new Date(), publishedAt: new Date(), unpublishedAt: null, unpublishedBy: null, coverageStart: null, coverageEnd: null, relevance: 0, manualFeatured: false, sponsored: false, sponsorDisclosure: null, photoLimit: null, videoLimit: null, homePlacement: "Nenhum", homeOrder: 0, version: 1 }, authorizedForPortal as any);
    expect(portalPayload).not.toHaveProperty("commercialRequestId");
    expect(portalPayload.editorialAuthorization).toMatchObject({ materialFromCommercialCoverage: true, authorized: true });
  });
});
