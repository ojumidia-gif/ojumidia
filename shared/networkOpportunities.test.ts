import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertKnownSpecialties,
  canAcceptInvite,
  canMutateOpportunityEconomics,
  derivedOpportunityStatus,
  executorSpecialtyToProfessionalIds,
  inviteStatusesAfterAccept,
  professionalEligibleForOpportunity,
  professionalMineBucket,
  specialtiesFromCommercialNeeds,
  splitOpportunityEconomics,
  workTypeFromCommercialNeeds,
} from "./networkOpportunities";
import { specialtyGrantsPrivilege } from "./professionalSpecialties";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Fase 3 — oportunidades territoriais", () => {
  it("cria snapshot econômico a partir da política, sem percentuais hardcoded de produto", () => {
    const split = splitOpportunityEconomics(1000, { executorPercent: 65, ojuPercent: 25, developmentPercent: 10, captorPercent: 0 });
    expect(split.professionalValue).toBe(650);
    expect(split.ojuValue).toBe(250);
    expect(split.networkFundValue).toBe(100);
    expect(source("server/opportunities.ts")).toContain("activeCommercialPolicy");
    expect(source("server/opportunities.ts")).not.toMatch(/executorPercent:\s*65/);
  });

  it("vincula solicitação comercial sem substituí-la e mapeia especialidade/território", () => {
    expect(specialtiesFromCommercialNeeds({ needsPhotography: true, needsVideo: true })).toEqual(["fotografo", "videomaker"]);
    expect(workTypeFromCommercialNeeds({ needsDocumentary: true })).toBe("Documentário");
    expect(source("server/opportunities.ts")).toContain("createOpportunityFromCommercialRequest");
    expect(source("server/opportunities.ts")).toContain("commercialRequestId");
    expect(source("drizzle/schema.ts")).toContain("export const commercialRequests");
    expect(source("server/routers/commercial.ts")).toContain("commercialRequests");
  });

  it("elegibilidade usa perfil profissional, especialidade e território estruturado", () => {
    expect(professionalEligibleForOpportunity({
      profileStatus: "Ativo",
      networkBond: "criador-parceiro",
      specialtyIds: ["fotografo", "videomaker"],
      authorizedTerritoryIds: [10, 11],
      opportunityTerritoryId: 10,
      requiredSpecialtyIds: ["fotografo"],
    })).toBe(true);
    expect(professionalEligibleForOpportunity({
      profileStatus: "Ativo",
      networkBond: "criador-parceiro",
      specialtyIds: ["historymaker"],
      authorizedTerritoryIds: [10],
      opportunityTerritoryId: 10,
      requiredSpecialtyIds: ["fotografo"],
    })).toBe(false);
    expect(professionalEligibleForOpportunity({
      profileStatus: "Ativo",
      networkBond: "criador-parceiro",
      specialtyIds: ["fotografo"],
      authorizedTerritoryIds: [99],
      opportunityTerritoryId: 10,
      requiredSpecialtyIds: ["fotografo"],
    })).toBe(false);
    expect(assertKnownSpecialties(["fotografo"])).toEqual(["fotografo"]);
    expect(() => assertKnownSpecialties(["piloto"])).toThrow(/especialidades normalizadas/);
    expect(executorSpecialtyToProfessionalIds.Fotografia).toEqual(["fotografo"]);
    expect(source("server/opportunities.ts")).toContain("professionalEligibleForOpportunity");
    expect(source("server/opportunities.ts")).not.toMatch(/users\.role.*fotografo/);
  });

  it("convite só pode ser aceito pelo destinatário, uma vez, e congela depois", () => {
    const ok = canAcceptInvite({
      opportunityStatus: "Aberta",
      inviteStatus: "Pendente",
      inviteProfileId: 7,
      actorProfileId: 7,
    });
    expect(ok.ok).toBe(true);
    expect(canAcceptInvite({ opportunityStatus: "Aberta", inviteStatus: "Pendente", inviteProfileId: 7, actorProfileId: 8 }).code).toBe("WRONG_RECIPIENT");
    expect(canAcceptInvite({ opportunityStatus: "Aberta", inviteStatus: "Pendente", inviteProfileId: 7, actorProfileId: 1 }).code).toBe("WRONG_RECIPIENT");
    expect(canAcceptInvite({ opportunityStatus: "Aceita", inviteStatus: "Pendente", inviteProfileId: 7, actorProfileId: 7 }).code).toBe("ALREADY_ACCEPTED");
    expect(canAcceptInvite({ opportunityStatus: "Cancelada", inviteStatus: "Pendente", inviteProfileId: 7, actorProfileId: 7 }).code).toBe("CANCELLED");
    expect(canAcceptInvite({
      opportunityStatus: "Aberta",
      inviteStatus: "Pendente",
      inviteExpiresAt: new Date("2020-01-01"),
      inviteProfileId: 7,
      actorProfileId: 7,
      now: new Date("2026-01-01"),
    }).code).toBe("EXPIRED");
    expect(inviteStatusesAfterAccept(2, [{ id: 2, status: "Pendente" }, { id: 3, status: "Pendente" }])).toEqual([
      { id: 2, status: "Aceita" },
      { id: 3, status: "Superada" },
    ]);
    expect(canMutateOpportunityEconomics("Aberta")).toBe(true);
    expect(canMutateOpportunityEconomics("Aceita")).toBe(false);
    expect(source("server/opportunities.ts")).toContain('eq(networkOpportunities.status, "Aberta")');
    expect(source("server/opportunities.ts")).toContain("CONFLICT");
    expect(source("server/opportunities.ts")).toContain("frozenAt");
  });

  it("expiração, recusa, cancelamento e buckets do profissional", () => {
    expect(derivedOpportunityStatus({ status: "Aberta", acceptanceDeadline: new Date("2020-01-01") }, new Date("2026-01-01"))).toBe("Expirada");
    expect(professionalMineBucket("Pendente", "Aberta")).toBe("disponiveis");
    expect(professionalMineBucket("Aceita", "Aceita")).toBe("aceitas");
    expect(professionalMineBucket("Recusada", "Aberta")).toBe("recusadas");
    expect(professionalMineBucket("Expirada", "Expirada")).toBe("expiradas");
    expect(source("server/opportunities.ts")).toContain("opportunity_invite_declined");
    expect(source("server/opportunities.ts")).toContain("opportunity_cancelled");
    expect(source("server/opportunities.ts")).toContain("opportunity_invite_expired");
  });

  it("RBAC territorial, Super Admin e auditoria existente", () => {
    expect(source("server/opportunities.ts")).toContain("assertPartnerScope");
    expect(source("server/opportunities.ts")).toContain("requireOpportunityAdmin");
    expect(source("server/opportunities.ts")).toContain("administrador principal");
    expect(source("server/opportunities.ts")).toContain("recordAuditEvent");
    expect(source("server/opportunities.ts")).toContain("opportunity_created");
    expect(source("server/opportunities.ts")).toContain("opportunity_invite_created");
    expect(source("server/opportunities.ts")).toContain("opportunity_invite_accepted");
    expect(source("server/opportunities.ts")).not.toMatch(/CREATE TABLE|ALTER TABLE/);
    expect(source("server/routers.ts")).toContain("opportunitiesRouter");
  });

  it("especialidade não concede privilégio e identidade profissional permanece no perfil", () => {
    expect(specialtyGrantsPrivilege("fotografo", "administrador")).toBe(false);
    expect(source("server/opportunities.ts")).toContain("professionalProfileForUser");
    expect(source("server/opportunities.ts")).toContain("professionalProfiles");
    expect(source("server/_core/oauth.ts")).not.toContain("networkOpportunities");
    expect(source("drizzle/0050_network_opportunities.sql")).toContain("networkOpportunities");
    expect(source("client/src/pages/admin/OpportunitiesAdmin.tsx")).toContain("Minhas oportunidades");
  });
});
