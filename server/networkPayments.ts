import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  networkOpportunities,
  networkPaymentIntents,
  networkPaymentWebhookReceipts,
  networkProductions,
} from "../drizzle/schema";
import {
  amountsMatchFrozen,
  closedPaymentMayReturnToPaid,
  getPaymentProvider,
  paymentIntentToSettlementStatus,
  parsePaymentWebhookPayload,
  verifyPaymentWebhookSignature,
  type PaymentIntentStatus,
} from "@shared/paymentProvider";
import { getProductionSettlement, openProductionSettlement, setProductionPaymentStatus } from "./networkCommerce";
import { getProduction } from "./productions";
import { recordAuditEvent } from "./partnerScope";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Actor = { id: number; role: string };

export function isMissingPaymentSchema(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${error}` : String(error);
  return /networkPaymentIntents|networkPaymentWebhookReceipts|ER_NO_SUCH_TABLE|doesn't exist/i.test(text);
}

async function withOptionalPaymentSchema<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isMissingPaymentSchema(error)) return fallback;
    throw error;
  }
}

function requirePaymentAdmin(role: string) {
  if (!["administrador", "administrador principal"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente administração autorizada inicia cobrança da Rede." });
  }
}

export async function createProductionPayment(db: Db, actor: Actor, input: { productionId: number; amount?: number }) {
  requirePaymentAdmin(actor.role);
  const scoped = await getProduction(db, actor, input.productionId);
  const production = scoped.production;
  if (production.status === "Cancelada") throw new TRPCError({ code: "BAD_REQUEST", message: "Produção cancelada não gera cobrança." });
  if (production.status !== "Concluída") throw new TRPCError({ code: "BAD_REQUEST", message: "Cobrança só depois da conclusão operacional. Pagamento não publica mídia nem encerra produção." });
  const opportunity = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, production.opportunityId)).limit(1))[0];
  if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade congelada não encontrada." });
  const expected = Number(opportunity.totalValue);
  if (input.amount !== undefined && !amountsMatchFrozen(expected, input.amount)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "O valor informado não coincide com o snapshot congelado da Opportunity." });
  }
  let settlement = await getProductionSettlement(db, production.id);
  if (!settlement) settlement = await openProductionSettlement(db, actor, production.id);
  const existingPaid = (await db.select().from(networkPaymentIntents).where(eq(networkPaymentIntents.productionId, production.id)))[0];
  if (existingPaid && (existingPaid.status === "Pago" || existingPaid.status === "Encerrado")) {
    throw new TRPCError({ code: "CONFLICT", message: "Esta produção já possui cobrança paga. Estorno não gera nova cobrança por este fluxo." });
  }
  if (existingPaid && existingPaid.status !== "Cancelado" && existingPaid.status !== "Falhou" && existingPaid.status !== "Estornado") {
    return { intent: existingPaid, pixCopyPaste: null as string | null, reused: true as const };
  }
  const provider = getPaymentProvider();
  const charge = await provider.createPayment({
    amount: expected,
    currency: "BRL",
    reference: String(production.id),
    description: `Produção ${production.id} · Opportunity ${opportunity.id}`,
  });
  const inserted = await db.insert(networkPaymentIntents).values({
    productionId: production.id,
    opportunityId: opportunity.id,
    settlementId: settlement.id,
    provider: charge.provider,
    providerTransactionId: charge.providerTransactionId,
    idempotencyKey: `production:${production.id}:${charge.providerTransactionId}`,
    amount: expected.toFixed(2),
    currency: "BRL",
    status: charge.status,
    createdBy: actor.id,
  });
  const id = Number(inserted[0].insertId);
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-payment",
    resourceId: id,
    action: "payment_created",
    nextState: { provider: charge.provider, providerTransactionId: charge.providerTransactionId, amount: expected, opportunityId: opportunity.id },
    detail: "Cobrança criada a partir do valor congelado. Sem dados de cartão nem credencial bancária. Pagamento não compra visibilidade na Rede.",
  });
  return { intent: { id, ...charge, amount: expected }, pixCopyPaste: charge.pixCopyPaste ?? null, reused: false as const };
}

export async function applyPaymentWebhook(db: Db, input: {
  rawBody: string;
  signature: string;
  timestamp: string;
}) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || "";
  const verified = verifyPaymentWebhookSignature({ secret, rawBody: input.rawBody, signature: input.signature, timestamp: input.timestamp });
  if (!verified.ok) {
    throw new TRPCError({ code: verified.code === "REPLAY" ? "BAD_REQUEST" : "UNAUTHORIZED", message: verified.message });
  }
  const parsed = parsePaymentWebhookPayload(input.rawBody);
  if (!parsed.ok) throw new TRPCError({ code: "BAD_REQUEST", message: parsed.message });
  const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");
  try {
    const duplicate = (await db.select().from(networkPaymentWebhookReceipts).where(eq(networkPaymentWebhookReceipts.eventId, parsed.eventId)).limit(1))[0];
    if (duplicate) {
      await recordAuditEvent(db, {
        actorId: null,
        resourceType: "network-payment-webhook",
        resourceId: duplicate.id,
        action: "payment_webhook_received",
        nextState: { eventId: parsed.eventId, duplicate: true },
        detail: "Webhook idempotente. Não duplica pagamento, settlement nem crédito.",
      });
      return { ok: true as const, duplicate: true as const };
    }
    const intent = (await db.select().from(networkPaymentIntents).where(eq(networkPaymentIntents.providerTransactionId, parsed.providerTransactionId)).limit(1))[0];
    if (!intent) throw new TRPCError({ code: "NOT_FOUND", message: "Cobrança não encontrada para este identificador." });
    if (intent.productionId !== parsed.productionId || intent.opportunityId !== parsed.opportunityId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Este webhook não pertence à Opportunity/Production desta cobrança." });
    }
    if (!amountsMatchFrozen(intent.amount, parsed.amount)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "O valor do webhook não coincide com o snapshot congelado." });
    }
    const production = (await db.select().from(networkProductions).where(eq(networkProductions.id, intent.productionId)).limit(1))[0];
    if (!production) throw new TRPCError({ code: "NOT_FOUND", message: "Produção não encontrada." });
    if (!closedPaymentMayReturnToPaid(intent.status) && parsed.status === "Pago") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cobrança encerrada, cancelada ou estornada não volta para pago." });
    }
    const previous = intent.status;
    await db.update(networkPaymentIntents).set({
      status: parsed.status,
      paidAt: parsed.status === "Pago" ? new Date() : intent.paidAt,
    }).where(eq(networkPaymentIntents.id, intent.id));
    await db.insert(networkPaymentWebhookReceipts).values({
      eventId: parsed.eventId,
      providerTransactionId: parsed.providerTransactionId,
      payloadHash,
      result: parsed.status,
    });
    await recordAuditEvent(db, {
      actorId: null,
      partnerId: production.partnerId,
      territoryId: production.territoryId,
      resourceType: "network-payment",
      resourceId: intent.id,
      action: parsed.status === "Estornado" ? "payment_refunded" : "payment_status_changed",
      previousState: { status: previous, amount: intent.amount },
      nextState: { status: parsed.status, amount: intent.amount, productionStatus: production.status },
      detail: "Status financeiro reconciliado pelo webhook. Não altera Opportunity congelada, não publica mídia e não encerra Production.",
    });
    const settlementStatus = paymentIntentToSettlementStatus(parsed.status);
    await setProductionPaymentStatus(db, { id: 0, role: "administrador principal" }, {
      productionId: production.id,
      paymentStatus: settlementStatus,
      fromWebhook: true,
    });
    if (parsed.status === "Pago" || parsed.status === "Encerrado") {
      await recordAuditEvent(db, {
        actorId: null,
        partnerId: production.partnerId,
        territoryId: production.territoryId,
        resourceType: "network-production-settlement",
        resourceId: intent.settlementId || production.id,
        action: parsed.status === "Encerrado" ? "settlement_closed" : "payment_status_changed",
        nextState: { settlementStatus, publicVisibleUnchanged: true },
        detail: "Pagamento não controla diretório público nem Home.",
      });
    }
    return { ok: true as const, duplicate: false as const, status: parsed.status };
  } catch (error) {
    if (isMissingPaymentSchema(error)) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Cobrança ainda não está disponível neste ambiente." });
    throw error;
  }
}

export async function listPaymentsForProduction(db: Db, actor: Actor, productionId: number) {
  void actor;
  return withOptionalPaymentSchema(async () => {
    return db.select({
      id: networkPaymentIntents.id,
      productionId: networkPaymentIntents.productionId,
      opportunityId: networkPaymentIntents.opportunityId,
      provider: networkPaymentIntents.provider,
      providerTransactionId: networkPaymentIntents.providerTransactionId,
      amount: networkPaymentIntents.amount,
      currency: networkPaymentIntents.currency,
      status: networkPaymentIntents.status,
      paidAt: networkPaymentIntents.paidAt,
      createdAt: networkPaymentIntents.createdAt,
    }).from(networkPaymentIntents).where(eq(networkPaymentIntents.productionId, productionId));
  }, []);
}

export type { PaymentIntentStatus };
