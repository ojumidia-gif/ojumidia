import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  matchProfessionalForOpportunity,
  professionalEligibleForOpportunity,
} from "./networkOpportunities";
import {
  canAdvancePayment,
  deliveryPublishesMedia,
  frozenFieldsUnchangedByPayment,
  notificationVisibleTo,
  paymentMayMutateOpportunity,
  settlementUsesCurrentPolicy,
  snapshotFrozenEconomics,
} from "./networkOperations";
import { productionMediaWithinLimit, PRODUCTION_MINICLIP_SECONDS, PRODUCTION_PHOTO_CAP } from "./networkProductions";
import { specialtyGrantsPrivilege } from "./professionalSpecialties";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

const base = {
  profileStatus: "Ativo",
  networkBond: "criador-parceiro",
  specialtyIds: ["fotografo"],
  authorizedTerritoryIds: [10],
  opportunityTerritoryId: 10,
  requiredSpecialtyIds: ["fotografo"],
};

describe("Fase 5 — operação da Rede, matching, notificações e comercial", () => {
  it("matching determinístico por especialidade, território, vínculo e status, sem score", () => {
    expect(matchProfessionalForOpportunity(base).eligible).toBe(true);
    expect(matchProfessionalForOpportunity({ ...base, specialtyIds: ["videomaker"] }).reasons).toContain("Especialidade incompatível.");
    expect(matchProfessionalForOpportunity({ ...base, authorizedTerritoryIds: [99] }).reasons).toContain("Território incompatível.");
    expect(matchProfessionalForOpportunity({ ...base, networkBond: "independente" }).reasons).toContain("Vínculo inativo.");
    expect(matchProfessionalForOpportunity({ ...base, profileStatus: "Suspenso" }).reasons).toContain("Perfil suspenso.");
    expect(professionalEligibleForOpportunity({ ...base, usersRole: "administrador principal" })).toBe(true);
    expect(source("server/opportunities.ts")).toContain("matchProfessionalForOpportunity");
    expect(source("server/opportunities.ts")).toContain("matching_executed");
    expect(source("shared/networkOpportunities.ts")).not.toMatch(/melhor profissional|pay to appear/i);
    expect(source("server/opportunities.ts")).not.toContain("from(users)");
    expect(source("server/opportunities.ts")).toContain("Sem score, ranking ou marketplace");
  });

  it("convites permanecem no sistema existente, com destinatário, expiração e concorrência", () => {
    expect(source("drizzle/schema.ts")).toContain("networkOpportunityInvites");
    expect(source("server/opportunities.ts")).toContain("WRONG_RECIPIENT");
    expect(source("server/opportunities.ts")).toContain('eq(networkOpportunities.status, "Aberta")');
    expect(source("server/opportunities.ts")).toContain("CONFLICT");
    expect(source("server/opportunities.ts")).toContain("opportunity_invite_created");
    expect(source("server/opportunities.ts")).toContain("opportunity_invite_accepted");
    expect(source("server/opportunities.ts")).toContain("opportunity_invite_declined");
    expect(source("server/opportunities.ts")).toContain("opportunity_invite_expired");
    expect(source("server/opportunities.ts")).not.toContain("opportunityInvites2");
  });

  it("notificações internas apontam para a entidade e só o destinatário lê", () => {
    expect(notificationVisibleTo(8, 8)).toBe(true);
    expect(notificationVisibleTo(8, 9)).toBe(false);
    expect(source("server/networkNotifications.ts")).toContain("notification_created");
    expect(source("server/networkNotifications.ts")).toContain("notification_read");
    expect(source("server/networkNotifications.ts")).toContain("recipientUserId");
    expect(source("client/src/pages/admin/NetworkNotificationsAdmin.tsx")).toContain("Não é feed");
    expect(source("client/src/App.tsx")).not.toContain("/feed");
  });

  it("comercial copia snapshot congelado e pagamento não altera a Opportunity", () => {
    const snap = snapshotFrozenEconomics({
      totalValue: "1000.00",
      professionalValue: "650.00",
      ojuValue: "250.00",
      networkFundValue: "100.00",
      captorValue: "0.00",
      commercialPolicyId: 3,
      commercialPolicyVersion: 2,
    });
    expect(snap.professionalValue).toBe("650.00");
    expect(snap.commercialPolicyVersion).toBe(2);
    expect(paymentMayMutateOpportunity("Pagamento confirmado")).toBe(false);
    expect(settlementUsesCurrentPolicy()).toBe(false);
    expect(frozenFieldsUnchangedByPayment()).toContain("professionalValue");
    expect(canAdvancePayment("Encerrado", "Aguardando pagamento")).toBe(false);
    expect(source("server/networkCommerce.ts")).not.toContain("update(networkOpportunities");
    expect(source("server/networkCommerce.ts")).not.toContain("activeCommercialPolicy");
    expect(source("server/networkCommerce.ts")).toContain("payment_state_changed");
    expect(source("server/networkCommerce.ts")).toContain("commercial_transaction_closed");
    expect(source("server/networkCommerce.ts")).not.toMatch(/pix|stripe|mercado pago/i);
  });

  it("entrega não publica e não cria segundo acervo nem portfólio", () => {
    expect(deliveryPublishesMedia()).toBe(false);
    expect(source("server/networkCommerce.ts")).toContain("delivery_created");
    expect(source("server/networkCommerce.ts")).toContain("delivery_completed");
    expect(source("server/networkCommerce.ts")).toContain("published: false");
    expect(source("server/networkCommerce.ts")).not.toContain("publicationAllowed: true");
    expect(source("server/networkCommerce.ts")).toContain("networkProductionDeliveries");
    expect(source("drizzle/schema.ts")).toContain("export const mediaAssets");
    expect(source("client/src/App.tsx")).not.toContain("/marketplace");
    expect(source("client/src/App.tsx")).not.toContain("/encontre-fotografo");
    expect(source("client/src/App.tsx")).not.toContain("/portfolio");
    expect(source("client/src/pages/admin/NetworkCommerceAdmin.tsx")).toContain("Entrega ao cliente ≠ publicação");
    expect(productionMediaWithinLimit({ mediaType: "foto", attachedPhotoCount: 5, attachedVideoCount: 0 }).ok).toBe(false);
    expect(productionMediaWithinLimit({ mediaType: "vídeo", durationSeconds: PRODUCTION_MINICLIP_SECONDS + 1, attachedPhotoCount: 0, attachedVideoCount: 0 }).ok).toBe(false);
    expect(PRODUCTION_PHOTO_CAP).toBe(5);
  });

  it("RBAC territorial, Super Admin, especialidade sem privilégio e Opportunity interna", () => {
    expect(specialtyGrantsPrivilege("fotografo", "administrador")).toBe(false);
    expect(source("server/opportunities.ts")).toContain("assertPartnerScope");
    expect(source("server/networkCommerce.ts")).toContain("administrador principal");
    expect(source("server/productions.ts")).toContain("assertProductionScope");
    expect(source("client/src/App.tsx")).not.toContain('path={"/oportunidades"}');
    expect(source("client/src/App.tsx")).not.toContain('path={"/opportunities"}');
    expect(source("server/opportunities.ts")).not.toMatch(/CREATE TABLE|ALTER TABLE/);
    expect(source("server/networkNotifications.ts")).not.toMatch(/CREATE TABLE|ALTER TABLE/);
    expect(source("server/networkCommerce.ts")).not.toMatch(/CREATE TABLE|ALTER TABLE/);
    expect(source("drizzle/0052_network_operations.sql")).toContain("networkNotifications");
  });
});
