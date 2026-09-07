import { createHmac, timingSafeEqual } from "node:crypto";

export const paymentIntentStatuses = [
  "Aguardando",
  "Iniciado",
  "Pendente",
  "Pago",
  "Falhou",
  "Cancelado",
  "Estornado",
  "Parcial",
  "Encerrado",
] as const;

export type PaymentIntentStatus = (typeof paymentIntentStatuses)[number];

export type PaymentCharge = {
  provider: string;
  providerTransactionId: string;
  amount: number;
  currency: "BRL";
  status: PaymentIntentStatus;
  pixCopyPaste?: string | null;
};

export type CreatePaymentInput = {
  amount: number;
  currency: "BRL";
  reference: string;
  description: string;
};

export interface PaymentProvider {
  name: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentCharge>;
  getPaymentStatus(providerTransactionId: string): Promise<PaymentCharge>;
  cancelPayment(providerTransactionId: string): Promise<PaymentCharge>;
  refundPayment(providerTransactionId: string, amount: number): Promise<PaymentCharge>;
}

export function amountsMatchFrozen(expected: number | string, received: number | string) {
  return Math.round(Number(expected) * 100) === Math.round(Number(received) * 100);
}

export function clientMayConfirmPayment() {
  return false;
}

export function paymentControlsDirectoryVisibility() {
  return false;
}

export function paymentIntentToSettlementStatus(status: PaymentIntentStatus) {
  if (status === "Pago") return "Pagamento confirmado" as const;
  if (status === "Parcial") return "Pagamento parcial" as const;
  if (status === "Cancelado" || status === "Falhou") return "Pagamento cancelado" as const;
  if (status === "Estornado") return "Reembolso" as const;
  if (status === "Encerrado") return "Encerrado" as const;
  if (status === "Iniciado" || status === "Pendente" || status === "Aguardando") return "Aguardando pagamento" as const;
  return "Aguardando pagamento" as const;
}

export function closedPaymentMayReturnToPaid(from: string) {
  return from !== "Encerrado" && from !== "Estornado" && from !== "Cancelado";
}

export function verifyPaymentWebhookSignature(input: {
  secret: string;
  rawBody: string;
  signature: string;
  timestamp: string;
  now?: number;
}) {
  if (!input.secret) return { ok: false as const, code: "NO_SECRET", message: "PAYMENT_WEBHOOK_SECRET não configurado." };
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return { ok: false as const, code: "INVALID", message: "Timestamp do webhook inválido." };
  const now = input.now ?? Date.now();
  if (Math.abs(now - ts * 1000) > 5 * 60 * 1000) return { ok: false as const, code: "REPLAY", message: "Webhook fora da janela de 5 minutos." };
  const expected = createHmac("sha256", input.secret).update(`${input.timestamp}.${input.rawBody}`).digest("hex");
  const received = input.signature.trim().toLowerCase();
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false as const, code: "INVALID", message: "Assinatura do webhook rejeitada." };
  return { ok: true as const };
}

export function parsePaymentWebhookPayload(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false as const, message: "JSON do webhook inválido." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false as const, message: "Payload do webhook inválido." };
  const body = parsed as Record<string, unknown>;
  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
  const providerTransactionId = typeof body.providerTransactionId === "string" ? body.providerTransactionId.trim() : "";
  const status = typeof body.status === "string" ? body.status : "";
  const amount = Number(body.amount);
  const productionId = Number(body.productionId);
  const opportunityId = Number(body.opportunityId);
  if (!eventId || !providerTransactionId) return { ok: false as const, message: "eventId e providerTransactionId são obrigatórios." };
  if (!paymentIntentStatuses.includes(status as PaymentIntentStatus)) return { ok: false as const, message: "Status de pagamento desconhecido." };
  if (!(amount > 0) || !Number.isInteger(productionId) || productionId <= 0 || !Number.isInteger(opportunityId) || opportunityId <= 0) {
    return { ok: false as const, message: "Produção, oportunidade e valor precisam ser válidos." };
  }
  return {
    ok: true as const,
    eventId,
    providerTransactionId,
    status: status as PaymentIntentStatus,
    amount,
    productionId,
    opportunityId,
  };
}

const charges = new Map<string, PaymentCharge>();

export class PixWebhookProvider implements PaymentProvider {
  name = "pix-webhook";

  async createPayment(input: CreatePaymentInput): Promise<PaymentCharge> {
    const providerTransactionId = `pix_${input.reference}_${Date.now()}`;
    const charge: PaymentCharge = {
      provider: this.name,
      providerTransactionId,
      amount: input.amount,
      currency: "BRL",
      status: "Iniciado",
      pixCopyPaste: null,
    };
    charges.set(providerTransactionId, charge);
    return charge;
  }

  async getPaymentStatus(providerTransactionId: string): Promise<PaymentCharge> {
    const charge = charges.get(providerTransactionId);
    if (!charge) throw new Error("Cobrança Pix não encontrada neste provedor isolado.");
    return charge;
  }

  async cancelPayment(providerTransactionId: string): Promise<PaymentCharge> {
    const charge = await this.getPaymentStatus(providerTransactionId);
    if (charge.status === "Pago" || charge.status === "Encerrado") throw new Error("Cobrança paga não cancela por este método.");
    const next = { ...charge, status: "Cancelado" as const };
    charges.set(providerTransactionId, next);
    return next;
  }

  async refundPayment(providerTransactionId: string, amount: number): Promise<PaymentCharge> {
    const charge = await this.getPaymentStatus(providerTransactionId);
    if (charge.status !== "Pago" && charge.status !== "Parcial") throw new Error("Estorno exige cobrança paga.");
    if (!amountsMatchFrozen(charge.amount, amount) && amount >= charge.amount) throw new Error("Valor de estorno inválido.");
    const next = { ...charge, status: "Estornado" as const };
    charges.set(providerTransactionId, next);
    return next;
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new PixWebhookProvider();
}

export const PAYMENT_ENV_NAMES = [
  "PAYMENT_WEBHOOK_SECRET",
  "PAYMENT_PROVIDER",
] as const;
