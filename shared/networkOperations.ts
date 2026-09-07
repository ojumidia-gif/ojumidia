import { frozenOpportunityFields } from "./networkProductions";

export const networkNotificationTypes = [
  "opportunity_invite",
  "opportunity_invite_expiring",
  "opportunity_invite_accepted",
  "opportunity_invite_declined",
  "opportunity_cancelled",
  "production_created",
  "production_started",
  "production_media_review",
  "production_review_requested",
  "production_completed",
  "payment_available",
  "payment_confirmed",
  "delivery_completed",
  "professional_service_request",
  "professional_origination_submitted",
] as const;

export type NetworkNotificationType = (typeof networkNotificationTypes)[number];

export const productionPaymentStatuses = [
  "Aguardando pagamento",
  "Pagamento recebido",
  "Pagamento parcial",
  "Pagamento confirmado",
  "Pagamento cancelado",
  "Reembolso",
  "Encerrado",
] as const;

export type ProductionPaymentStatus = (typeof productionPaymentStatuses)[number];

export function notificationVisibleTo(actorUserId: number, recipientUserId: number) {
  return actorUserId === recipientUserId;
}

export function snapshotFrozenEconomics(opportunity: {
  totalValue: string | number;
  professionalValue: string | number;
  ojuValue: string | number;
  networkFundValue: string | number;
  captorValue: string | number;
  commercialPolicyId: number;
  commercialPolicyVersion: number;
}) {
  return {
    totalValue: String(opportunity.totalValue),
    professionalValue: String(opportunity.professionalValue),
    ojuValue: String(opportunity.ojuValue),
    networkFundValue: String(opportunity.networkFundValue),
    captorValue: String(opportunity.captorValue),
    commercialPolicyId: opportunity.commercialPolicyId,
    commercialPolicyVersion: opportunity.commercialPolicyVersion,
  };
}

export function paymentMayMutateOpportunity(_status: ProductionPaymentStatus) {
  return false;
}

export function deliveryPublishesMedia() {
  return false;
}

export function settlementUsesCurrentPolicy() {
  return false;
}

export function frozenFieldsUnchangedByPayment() {
  return frozenOpportunityFields();
}

export function canAdvancePayment(from: string, to: string) {
  if (from === "Encerrado" && to !== "Encerrado") return false;
  if (from === "Pagamento cancelado" && to !== "Reembolso" && to !== "Encerrado") return false;
  return productionPaymentStatuses.includes(to as ProductionPaymentStatus);
}
