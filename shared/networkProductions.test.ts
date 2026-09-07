import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canAttachProductionMedia,
  canSubmitProductionForReview,
  canTransitionProduction,
  frozenOpportunityFields,
  productionCanMarkMediaPublic,
  productionMediaWithinLimit,
  PRODUCTION_MINICLIP_CAP,
  PRODUCTION_MINICLIP_SECONDS,
  PRODUCTION_PHOTO_CAP,
} from "./networkProductions";
import { MAX_MINICLIP_DURATION_SECONDS, MAX_MINICLIPS, MAX_PHOTOS } from "./const";
import { specialtyGrantsPrivilege } from "./professionalSpecialties";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Fase 4 — produção contextual, não portfólio", () => {
  it("oportunidade aceita gera produção ligada ao perfil e ao território", () => {
    expect(source("server/opportunities.ts")).toContain("createProductionFromAcceptedOpportunity");
    expect(source("server/productions.ts")).toContain("opportunity.status !== \"Aceita\"");
    expect(source("server/productions.ts")).toContain("acceptedProfessionalProfileId");
    expect(source("server/productions.ts")).toContain("territoryId: opportunity.territoryId");
    expect(source("drizzle/schema.ts")).toContain("opportunityId: int(\"opportunityId\").notNull().unique()");
  });

  it("mídia reutiliza mediaAssets, com contexto, e não fica pública no envio", () => {
    expect(source("server/productions.ts")).toContain("from(mediaAssets)");
    expect(source("server/productions.ts")).toContain("networkProductionMedia");
    expect(source("server/productions.ts")).not.toContain("productionGallery");
    expect(source("server/productions.ts")).not.toContain("productionPortfolio");
    expect(source("drizzle/schema.ts")).toContain("export const mediaAssets");
    expect(source("client/src/App.tsx")).not.toContain("/portfolio");
    expect(source("client/src/App.tsx")).not.toContain("/meu-portfolio");
    expect(source("client/src/pages/admin/ProductionsAdmin.tsx")).toContain("Não é portfólio");
    expect(source("server/productions.ts")).toContain("publicationAllowed: media.publicationAllowed");
    expect(source("server/productions.ts")).not.toMatch(/publicationAllowed:\s*true/);
  });

  it("backend bloqueia a 6ª foto, o 2º miniclip e vídeo de 61 segundos", () => {
    expect(PRODUCTION_PHOTO_CAP).toBe(MAX_PHOTOS);
    expect(PRODUCTION_MINICLIP_CAP).toBe(MAX_MINICLIPS);
    expect(PRODUCTION_MINICLIP_SECONDS).toBe(MAX_MINICLIP_DURATION_SECONDS);
    expect(productionMediaWithinLimit({ mediaType: "foto", attachedPhotoCount: 4, attachedVideoCount: 0 }).ok).toBe(true);
    expect(productionMediaWithinLimit({ mediaType: "foto", attachedPhotoCount: 5, attachedVideoCount: 0 }).ok).toBe(false);
    expect(productionMediaWithinLimit({ mediaType: "vídeo", durationSeconds: 60, attachedPhotoCount: 0, attachedVideoCount: 0 }).ok).toBe(true);
    expect(productionMediaWithinLimit({ mediaType: "vídeo", durationSeconds: 60, attachedPhotoCount: 0, attachedVideoCount: 1 }).ok).toBe(false);
    expect(productionMediaWithinLimit({ mediaType: "vídeo", durationSeconds: 61, attachedPhotoCount: 0, attachedVideoCount: 0 }).ok).toBe(false);
    expect(source("server/productions.ts")).toContain("productionMediaWithinLimit");
    expect(canAttachProductionMedia("Cancelada")).toBe(false);
    expect(canAttachProductionMedia("Em produção")).toBe(true);
  });

  it("autorização é exigida para aptidão editorial e não publica sozinha", () => {
    expect(productionCanMarkMediaPublic({
      productionStatus: "Em revisão",
      mediaPublicationAllowed: true,
      mediaAuthorization: "Cessão",
      portalAuthorization: true,
    })).toBe(true);
    expect(productionCanMarkMediaPublic({
      productionStatus: "Em revisão",
      mediaPublicationAllowed: false,
      mediaAuthorization: "Cessão",
      portalAuthorization: true,
    })).toBe(false);
    expect(productionCanMarkMediaPublic({
      productionStatus: "Em revisão",
      mediaPublicationAllowed: true,
      mediaAuthorization: "Pendente",
      portalAuthorization: true,
    })).toBe(false);
    expect(source("server/productions.ts")).toContain("canUseOnPortal");
    expect(source("server/productions.ts")).toContain("published: false");
    expect(source("server/productions.ts")).toContain("commercialEditorialAuthorizations");
  });

  it("RBAC, Super Admin, profissional só a própria produção, especialidade sem privilégio", () => {
    expect(source("server/productions.ts")).toContain("assertProductionScope");
    expect(source("server/productions.ts")).toContain("administrador principal");
    expect(source("server/productions.ts")).toContain("professionalProfileId");
    expect(source("server/productions.ts")).toContain("assertPartnerScope");
    expect(specialtyGrantsPrivilege("fotografo", "administrador")).toBe(false);
    expect(source("server/productions.ts")).not.toContain("users.role =");
    expect(source("client/src/lib/adminNav.ts")).toContain("/admin/producoes");
  });

  it("produção cancelada não segue; valores congelados da Opportunity não são escritos", () => {
    expect(canTransitionProduction("Cancelada", "Em produção")).toBe(false);
    expect(canSubmitProductionForReview("Cancelada", 2)).toBe(false);
    expect(source("server/productions.ts")).not.toContain("update(networkOpportunities");
    expect(source("server/productions.ts")).not.toContain("networkOpportunities).set");
    expect(frozenOpportunityFields()).toContain("commercialPolicyVersion");
    expect(source("server/productions.ts")).toContain("production_created");
    expect(source("server/productions.ts")).toContain("media_attached");
    expect(source("server/productions.ts")).toContain("production_completed");
    expect(source("server/productions.ts")).not.toMatch(/CREATE TABLE|ALTER TABLE/);
    expect(source("drizzle/0051_network_productions.sql")).toContain("networkProductions");
    expect(source("server/routers.ts")).toContain("productionsRouter");
  });
});
