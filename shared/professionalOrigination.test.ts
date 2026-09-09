import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { specialtyGrantsPrivilege } from "./professionalSpecialties";
import { paymentControlsDirectoryVisibility } from "./paymentProvider";
import {
  originatorIsNotRecordCreator,
  originationChangesDirectoryRank,
  originationCreatesHomeFeature,
  originationCreatesPublication,
  parseOriginFromNotes,
  professionalCanOriginateLead,
  professionalMayCreateOpportunity,
  professionalMayMutateCommercialPolicy,
  professionalMayMutateSettlement,
  isOwnProfessionalOrigination,
  professionalOwnsOrigin,
  profileAcceptsPublicServiceRequests,
  salesVolumeChangesDirectoryRank,
  stampOriginOnNotes,
  stripOriginFromNotes,
  futureSchemaForOrigination,
} from "./professionalOrigination";
import { decideProfessionalDirectory } from "./territorialVisibility";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Autonomia comercial e originação territorial", () => {
  it("1 profissional só opera origem própria; 2 não ganha RBAC administrativo", () => {
    const origin = { v: 1 as const, kind: "profissional" as const, originatedByProfessionalProfileId: 7, requestedProfessionalProfileId: 7, createdByUserId: 3 };
    expect(professionalOwnsOrigin(origin, 7)).toBe(true);
    expect(professionalOwnsOrigin(origin, 8)).toBe(false);
    expect(isOwnProfessionalOrigination(origin, 7)).toBe(true);
    expect(isOwnProfessionalOrigination({ ...origin, kind: "visitante-profissional", originatedByProfessionalProfileId: null, requestedProfessionalProfileId: 7 }, 7)).toBe(false);
    expect(professionalMayCreateOpportunity("criador")).toBe(false);
    expect(professionalMayCreateOpportunity("administrador")).toBe(true);
    expect(specialtyGrantsPrivilege("fotografo", "administrador")).toBe(false);
    expect(source("server/opportunities.ts")).toContain("requireOpportunityAdmin");
    expect(source("server/professionalOrigination.ts")).toContain("professionalProfileForUser");
  });

  it("3–4 profissional não publica Home nem altera curadoria", () => {
    expect(originationCreatesHomeFeature()).toBe(false);
    expect(source("server/professionalOrigination.ts")).toContain("homeFeatured: false");
    expect(source("server/professionalOrigination.ts")).not.toContain("homePlacement");
    expect(source("server/routers/editorial.ts")).toContain("assertAdmin");
  });

  it("5–6 não altera política comercial nem settlement", () => {
    expect(professionalMayMutateCommercialPolicy("criador")).toBe(false);
    expect(professionalMayMutateSettlement("criador")).toBe(false);
    expect(source("server/professionalOrigination.ts")).not.toContain("commercialPolicies");
    expect(source("server/professionalOrigination.ts")).not.toContain("networkProductionSettlements");
    expect(source("server/networkCommerce.ts")).toContain("requireCommerceAdmin");
  });

  it("7–8 origina lead quando perfil Ativo; createdBy ≠ originatedBy", () => {
    expect(professionalCanOriginateLead({ status: "Ativo", userId: 4, territoryId: 10 }).ok).toBe(true);
    expect(professionalCanOriginateLead({ status: "Suspenso", userId: 4, territoryId: 10 }).ok).toBe(false);
    const origin = { v: 1 as const, kind: "profissional" as const, originatedByProfessionalProfileId: 9, requestedProfessionalProfileId: 9, createdByUserId: 4 };
    expect(originatorIsNotRecordCreator(origin, 99)).toBe(true);
    const stamped = stampOriginOnNotes("contexto", origin);
    expect(parseOriginFromNotes(stamped)?.originatedByProfessionalProfileId).toBe(9);
    expect(stripOriginFromNotes(stamped)).toBe("contexto");
  });

  it("9–11 originação não vira publicação, destaque nem Home", () => {
    expect(originationCreatesPublication()).toBe(false);
    expect(source("server/professionalOrigination.ts")).toContain("opportunityCreated: false");
    expect(source("server/professionalOrigination.ts")).toContain("publicationCreated: false");
    expect(source("server/professionalOrigination.ts")).not.toContain("insert(publications");
    expect(source("server/professionalOrigination.ts")).not.toContain("insert(networkOpportunities");
  });

  it("12–14 venda e origem não alteram ranking nem curadoria", () => {
    expect(salesVolumeChangesDirectoryRank()).toBe(false);
    expect(originationChangesDirectoryRank()).toBe(false);
    expect(paymentControlsDirectoryVisibility()).toBe(false);
    expect(decideProfessionalDirectory({ status: "Ativo", publicVisible: true }).directoryEligible).toBe(true);
    expect(source("shared/territorialVisibility.ts")).toContain("paymentNeverBuysEditorialOrDirectory");
  });

  it("15–16 território no backend; especialidade não é RBAC", () => {
    expect(source("server/professionalOrigination.ts")).toContain("territoryId: profile.territoryId");
    expect(source("server/professionalOrigination.ts")).toContain("isOwnProfessionalOrigination");
    expect(source("server/opportunities.ts")).toContain("assertPartnerScope");
    expect(specialtyGrantsPrivilege("videomaker", "administrador principal")).toBe(false);
  });

  it("17–19 produção ≠ publicação; direitos e pagamento intactos", () => {
    expect(source("server/productions.ts")).toContain("published: false");
    expect(source("server/commercialEditorialAuthorization.ts")).toContain("canUseOnPortal");
    expect(source("shared/paymentProvider.ts")).toContain("export function clientMayConfirmPayment");
  });

  it("20 originação não cria Opportunity; create de Opportunity continua admin", () => {
    expect(source("server/routers/commercial.ts")).toContain("originateLead");
    expect(source("server/routers/opportunities.ts")).toContain("createNetworkOpportunity");
    expect(source("server/opportunities.ts")).toContain('Somente administração autorizada opera oportunidades da Rede.');
    expect(futureSchemaForOrigination.applyNow).toBe(false);
  });

  it("perfil público aceita pedido só se elegível na Rede; sem tabela services", () => {
    expect(profileAcceptsPublicServiceRequests({ status: "Ativo", publicVisible: true })).toBe(true);
    expect(profileAcceptsPublicServiceRequests({ status: "Ativo", publicVisible: false })).toBe(false);
    expect(source("drizzle/schema.ts")).not.toContain("export const professionalServices");
    expect(source("client/src/pages/NetworkProfessionalPublic.tsx")).toContain("Solicitar serviço");
    expect(source("client/src/pages/NetworkProfessionalPublic.tsx")).not.toContain("estrelas");
    expect(source("client/src/App.tsx")).toContain("/rede/originar");
  });
});
