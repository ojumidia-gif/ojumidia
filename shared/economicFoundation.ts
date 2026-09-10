/**
 * Fundação econômica oficial do Ojú (PROMPT 1).
 * Não é MonetizationEngine. Não cobra. Não conecta PSP. Não cria carteira.
 * Fonte normativa em prosa: docs/ARQUITETURA_ECONOMICA_OJU.md
 */

import { amountsMatchFrozen, clientMayConfirmPayment, paymentControlsDirectoryVisibility } from "./paymentProvider";
import { settlementUsesCurrentPolicy } from "./networkOperations";
import { PRODUCTION_MINICLIP_CAP, PRODUCTION_MINICLIP_SECONDS, PRODUCTION_PHOTO_CAP } from "./networkProductions";

export const economicFoundationVersion = "1.2.0-beta-prep-prompt3" as const;

export function isRealMonetizationActive() {
  return false;
}

export function isRealPspConnected() {
  return false;
}

export function clientPaidAmountIsAutomaticallyOjuRevenue() {
  return false;
}

export function administratorIsAutomaticallyBeneficiary() {
  return false;
}

export function originationEqualsPayment() {
  return false;
}

export function editorialWindowIsFinancialCap() {
  return false;
}

export function directoryVisibilityIsPurchasable() {
  return paymentControlsDirectoryVisibility();
}

export function publicClientMayConfirmPayment() {
  return clientMayConfirmPayment();
}

/** Anúncio fora de Rascunho congela valor e participação. Não reabre ao voltar o status no mesmo request. */
export function commercialCaptureEconomicsFrozen(status: string) {
  return status !== "Rascunho";
}

export function commercialCaptureEconomicsMatch(
  current: { contractedAmount: number | string; ojuSharePercent: number | string; captorSharePercent: number | string },
  next: { contractedAmount: number | string; ojuSharePercent: number | string; captorSharePercent: number | string },
) {
  return amountsMatchFrozen(current.contractedAmount, next.contractedAmount)
    && amountsMatchFrozen(current.ojuSharePercent, next.ojuSharePercent)
    && amountsMatchFrozen(current.captorSharePercent, next.captorSharePercent);
}

export function acceptedOperationRereadsLivePolicy() {
  return settlementUsesCurrentPolicy();
}

export const editorialWindowPerUnit = {
  photos: PRODUCTION_PHOTO_CAP,
  miniclips: PRODUCTION_MINICLIP_CAP,
  miniclipSeconds: PRODUCTION_MINICLIP_SECONDS,
} as const;

/** Papéis econômicos — podem coincidir numa pessoa, nunca são sinônimos. */
export const economicRoles = [
  "createdBy",
  "originatedBy",
  "acceptedBy",
  "executedBy",
  "contractedBy",
  "managedBy",
  "beneficiary",
  "operator",
  "client",
  "professional",
  "partner",
  "oju",
] as const;

export type EconomicRole = (typeof economicRoles)[number];

export const economicProductIds = [
  "rede-gratuita",
  "presenca-territorial-basica",
  "producao-cobertura",
  "documentacao-memoria",
  "anuncio-identificado",
  "presenca-comercial-territorial",
  "visibilidade-institucional",
  "projeto-institucional",
  "licenciamento",
  "originacao",
  "saas-futuro",
  "apoio-institucional",
  "oficina",
] as const;

export type EconomicProductId = (typeof economicProductIds)[number];

export type MonetizationStance = "never" | "beta-off-future-possible" | "not-a-product";

export const economicProducts: Record<
  EconomicProductId,
  {
    label: string;
    existingSurfaces: string[];
    stance: MonetizationStance;
    policyScope: string | null;
  }
> = {
  "rede-gratuita": {
    label: "Rede gratuita",
    existingSurfaces: ["professionalProfiles", "institutions", "/rede"],
    stance: "never",
    policyScope: null,
  },
  "presenca-territorial-basica": {
    label: "Presença territorial básica",
    existingSurfaces: ["institutions", "partnerTerritories", "taxonomies"],
    stance: "never",
    policyScope: null,
  },
  "producao-cobertura": {
    label: "Produção / cobertura",
    existingSurfaces: ["commercialRequests", "networkOpportunities", "networkProductions"],
    stance: "beta-off-future-possible",
    policyScope: "Cobertura | Documentário | Fotografia | Outro",
  },
  "documentacao-memoria": {
    label: "Documentação / memória",
    existingSurfaces: ["oralMemories", "networkVoices", "publications"],
    stance: "never",
    policyScope: null,
  },
  "anuncio-identificado": {
    label: "Visibilidade comercial identificada (anúncio)",
    existingSurfaces: ["advertisements"],
    stance: "beta-off-future-possible",
    policyScope: "Anúncio",
  },
  "presenca-comercial-territorial": {
    label: "Presença comercial territorial",
    existingSurfaces: ["institutions.directoryScope=Serviço comunitário"],
    stance: "beta-off-future-possible",
    policyScope: "Visibilidade institucional",
  },
  "visibilidade-institucional": {
    label: "Visibilidade institucional",
    existingSurfaces: ["institutionVisibilitySubscriptions"],
    stance: "beta-off-future-possible",
    policyScope: "Visibilidade institucional",
  },
  "projeto-institucional": {
    label: "Projetos institucionais",
    existingSurfaces: ["publications contentKind=Projeto", "revenueLeads Apoio"],
    stance: "beta-off-future-possible",
    policyScope: null,
  },
  "licenciamento": {
    label: "Licenciamento",
    existingSurfaces: ["revenueLeads Licenciamento de mídia"],
    stance: "beta-off-future-possible",
    policyScope: null,
  },
  originacao: {
    label: "Originação de oportunidades",
    existingSurfaces: ["OJU_ORIGIN_V1 em commercialRequests.notes"],
    stance: "beta-off-future-possible",
    policyScope: "captorPercent na policy — sem pagamento no Beta",
  },
  "saas-futuro": {
    label: "Ferramentas futuras / SaaS",
    existingSurfaces: [],
    stance: "not-a-product",
    policyScope: null,
  },
  "apoio-institucional": {
    label: "Apoio institucional",
    existingSurfaces: ["revenueLeads Apoio institucional"],
    stance: "beta-off-future-possible",
    policyScope: null,
  },
  oficina: {
    label: "Oficina",
    existingSurfaces: ["revenueLeads Oficina"],
    stance: "beta-off-future-possible",
    policyScope: null,
  },
};

export const forbiddenCreations = [
  "MonetizationEngine",
  "ServicesEngine",
  "tabela services sem justificativa",
  "wallet / saldo / carteira de profissional",
  "checkout comercial no Beta",
  "PSP real (Mercado Pago, Stripe, Asaas, Pagar.me)",
  "pay-to-appear / ranking pago / Home comprada",
  "seeds comerciais permanentes",
] as const;

export const architecturalDebts = [
  "dual-rail-mesa-vs-rede",
  "contracts-default-30-70-administrator",
  "payout-notification-is-not-settlement",
  "origination-in-editable-notes",
  "pix-provider-in-memory-stub",
  "network-fund-without-legal-person",
  "license-eligibility-protected-vs-public-form",
  "networkExecutors-parallel-to-professionalProfiles",
] as const;

export type ArchitecturalDebtId = (typeof architecturalDebts)[number];

export const futureEconomicStates = [
  "Rascunho",
  "Proposta",
  "Aceita",
  "Contratada",
  "Aguardando pagamento",
  "Pagamento confirmado",
  "Em execução",
  "Concluída",
  "Liquidada",
] as const;

export const futureExceptionStates = [
  "Cancelada",
  "Cancelada pelo cliente",
  "Cancelada pelo Ojú",
  "Cancelada pelo profissional",
  "Pagamento falhou",
  "Pagamento expirado",
  "Reembolso solicitado",
  "Reembolso parcial",
  "Reembolso total",
  "Chargeback",
  "Em disputa",
  "Resolvida",
  "Reversão",
  "Encerrada",
] as const;

export const existingOperationalRails = {
  desk: ["commercialRequests", "commercialTransactions", "commercialRefundPolicies", "contracts"],
  network: ["networkOpportunities", "networkProductions", "networkProductionSettlements", "networkPaymentIntents"],
} as const;

export function betaAllowsPublicGrowthWithoutCheckout() {
  return !isRealMonetizationActive() && !directoryVisibilityIsPurchasable();
}

/** `payoutStatus` / avisos de captação não são liquidação bancária. */
export function commercialPayoutStatusIsBankSettlement() {
  return false;
}

/** Default 30/70 em `contracts` mistura cargo territorial com fatia financeira. Não substituir por outro %. */
export function contractsAdministratorShareIsApprovedEconomicRule() {
  return false;
}

export const stateLayers = ["operational", "economic", "payment", "settlement"] as const;
export type StateLayer = (typeof stateLayers)[number];

export const dualRailJoinHints = {
  commercialRequestId: ["commercialRequests.id", "networkOpportunities.commercialRequestId", "networkProductions.commercialRequestId", "contracts.requestId", "commercialTransactions.requestId"],
  opportunityId: ["networkOpportunities.id", "networkProductions.opportunityId", "networkProductionSettlements.opportunityId", "networkPaymentIntents.opportunityId"],
  productionId: ["networkProductions.id", "networkProductionSettlements.productionId", "networkPaymentIntents.productionId"],
  commercialPolicyId: ["commercialPolicies.id", "networkOpportunities.commercialPolicyId", "networkProductionSettlements.commercialPolicyId", "commercialTransactions.commercialPolicyId"],
  contractsMissing: ["opportunityId", "productionId", "commercialPolicyId", "originatedBy", "executor"],
} as const;

export const payoutSurfaces = {
  advertisements: "INTENÇÃO DE REPASSE / ESTADO OPERACIONAL",
  institutionVisibility: "INTENÇÃO DE REPASSE / ESTADO OPERACIONAL",
  contracts: "INTENÇÃO DE REPASSE / ESTADO OPERACIONAL",
  commercialPayoutNotifications: "AVISO OPERACIONAL — não é TED/Pix",
  networkProductionSettlements: "SNAPSHOT + ESTADO DE PAGAMENTO OPERACIONAL — não é liquidação bancária",
  networkPaymentIntents: "INTENÇÃO DE COBRANÇA no stub pix-webhook — não é PSP real",
} as const;

export const proposedMigrationsNotToApply = [
  "originatedByProfessionalProfileId + originKind em commercialRequests e networkOpportunities",
] as const;
