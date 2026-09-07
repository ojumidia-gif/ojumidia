import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import {
  commercialTransactions,
  networkOpportunities,
  networkProductionDeliveries,
  networkProductions,
  networkProductionSettlements,
} from "../drizzle/schema";
import {
  canAdvancePayment,
  snapshotFrozenEconomics,
  type ProductionPaymentStatus,
} from "@shared/networkOperations";
import { createNetworkNotification } from "./networkNotifications";
import { assertPartnerScope, recordAuditEvent } from "./partnerScope";
import { professionalProfileForUser } from "./professionalNetwork";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Actor = { id: number; role: string };

export function isMissingCommerceSchema(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${error}` : String(error);
  return /networkProductionSettlements|networkProductionDeliveries|ER_NO_SUCH_TABLE|doesn't exist/i.test(text);
}

async function withOptionalCommerceSchema<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isMissingCommerceSchema(error)) return fallback;
    throw error;
  }
}

function requireCommerceAdmin(role: string) {
  if (!["administrador", "administrador principal"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente administração autorizada opera o encerramento comercial da Rede." });
  }
}

async function assertProductionCommerceScope(db: Db, actor: Actor, production: typeof networkProductions.$inferSelect) {
  if (actor.role === "administrador principal") return;
  const profile = await professionalProfileForUser(db, actor.id);
  if (profile && profile.id === production.professionalProfileId) return;
  if (production.professionalUserId === actor.id) return;
  requireCommerceAdmin(actor.role);
  try {
    await assertPartnerScope({
      db,
      actor,
      partnerId: production.partnerId,
      territoryIds: [production.territoryId],
      resourceLabel: "este encerramento comercial",
      requirePartner: Boolean(production.partnerId),
    });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do território autorizado." });
  }
}

export async function getProductionSettlement(db: Db, productionId: number) {
  return withOptionalCommerceSchema(async () => {
    return (await db.select().from(networkProductionSettlements).where(eq(networkProductionSettlements.productionId, productionId)).limit(1))[0] ?? null;
  }, null);
}

export async function listProductionDeliveries(db: Db, productionId: number) {
  return withOptionalCommerceSchema(async () => {
    return db.select().from(networkProductionDeliveries).where(eq(networkProductionDeliveries.productionId, productionId));
  }, []);
}

export async function listSettlementsForAdmin(db: Db, actor: Actor) {
  requireCommerceAdmin(actor.role);
  return withOptionalCommerceSchema(async () => {
    const rows = await db.select().from(networkProductionSettlements).orderBy(desc(networkProductionSettlements.updatedAt));
    const visible = [];
    for (const row of rows) {
      const production = (await db.select().from(networkProductions).where(eq(networkProductions.id, row.productionId)).limit(1))[0];
      if (!production) continue;
      try {
        await assertProductionCommerceScope(db, actor, production);
        visible.push({ ...row, title: production.title, territoryId: production.territoryId, status: production.status, deliveredAt: production.deliveredAt });
      } catch {
        /* fora do escopo */
      }
    }
    return visible;
  }, []);
}

export async function openProductionSettlement(db: Db, actor: Actor, productionId: number) {
  requireCommerceAdmin(actor.role);
  const production = (await db.select().from(networkProductions).where(eq(networkProductions.id, productionId)).limit(1))[0];
  if (!production) throw new TRPCError({ code: "NOT_FOUND", message: "Produção não encontrada." });
  await assertProductionCommerceScope(db, actor, production);
  if (production.status !== "Concluída") throw new TRPCError({ code: "BAD_REQUEST", message: "O fluxo comercial só abre depois da conclusão operacional. Pagamento não publica mídia." });
  const existing = await getProductionSettlement(db, production.id);
  if (existing) return existing;
  const opportunity = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, production.opportunityId)).limit(1))[0];
  if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade congelada não encontrada." });
  const snap = snapshotFrozenEconomics(opportunity);
  const inserted = await db.insert(networkProductionSettlements).values({
    productionId: production.id,
    opportunityId: opportunity.id,
    commercialRequestId: production.commercialRequestId,
    ...snap,
    paymentStatus: "Aguardando pagamento",
    createdBy: actor.id,
  });
  const id = Number(inserted[0].insertId);
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-production-settlement",
    resourceId: id,
    action: "settlement_created",
    nextState: { paymentStatus: "Aguardando pagamento", commercialPolicyVersion: snap.commercialPolicyVersion, professionalValue: snap.professionalValue },
    detail: "Snapshot econômico copiado da Opportunity congelada. A produção e o pagamento não reescrevem a oportunidade.",
  });
  await createNetworkNotification(db, {
    actorId: actor.id,
    recipientUserId: production.professionalUserId,
    type: "payment_available",
    referenceType: "network-production",
    referenceId: production.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
  });
  return (await getProductionSettlement(db, production.id))!;
}

export async function setProductionPaymentStatus(db: Db, actor: Actor, input: { productionId: number; paymentStatus: ProductionPaymentStatus; fromWebhook?: boolean }) {
  if (!input.fromWebhook && ["Pagamento recebido", "Pagamento parcial", "Pagamento confirmado"].includes(input.paymentStatus)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Pago só é confirmado pelo webhook reconciliado. O navegador não altera esse estado." });
  }
  if (!input.fromWebhook) requireCommerceAdmin(actor.role);
  const production = (await db.select().from(networkProductions).where(eq(networkProductions.id, input.productionId)).limit(1))[0];
  if (!production) throw new TRPCError({ code: "NOT_FOUND", message: "Produção não encontrada." });
  await assertProductionCommerceScope(db, actor, production);
  if (production.status === "Cancelada") throw new TRPCError({ code: "BAD_REQUEST", message: "Produção cancelada não altera pagamento." });
  let settlement = await getProductionSettlement(db, production.id);
  if (!settlement) settlement = await openProductionSettlement(db, actor, production.id);
  if (!canAdvancePayment(settlement.paymentStatus, input.paymentStatus)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Este estado de pagamento não pode avançar assim." });
  }
  const previous = settlement.paymentStatus;
  let commercialTransactionId = settlement.commercialTransactionId;
  if (input.paymentStatus === "Encerrado" && production.commercialRequestId && !commercialTransactionId) {
    try {
      const inserted = await db.insert(commercialTransactions).values({
        requestId: production.commercialRequestId,
        partnerId: production.partnerId,
        territoryId: production.territoryId,
        transactionType: "Cobrança",
        status: "Registrada",
        grossAmount: settlement.totalValue,
        executorAmount: settlement.professionalValue,
        partnerGrossAmount: String((Number(settlement.totalValue) - Number(settlement.professionalValue)).toFixed(2)),
        partnerNetAmount: settlement.networkFundValue,
        ojuAmount: settlement.ojuValue,
        commercialPolicyId: settlement.commercialPolicyId,
        commercialPolicyVersion: settlement.commercialPolicyVersion,
        reason: "Encerramento operacional da produção. Valores copiados da Opportunity congelada, sem recálculo da política vigente.",
        createdByUserId: actor.id,
      });
      commercialTransactionId = Number(inserted[0].insertId);
    } catch (error) {
      console.error("[network-commerce] transação comercial opcional", error);
    }
  }
  await db.update(networkProductionSettlements).set({
    paymentStatus: input.paymentStatus,
    commercialTransactionId,
  }).where(eq(networkProductionSettlements.id, settlement.id));
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-production-settlement",
    resourceId: settlement.id,
    action: input.paymentStatus === "Encerrado" ? "commercial_transaction_closed" : "payment_state_changed",
    previousState: { paymentStatus: previous, professionalValue: settlement.professionalValue, commercialPolicyVersion: settlement.commercialPolicyVersion },
    nextState: { paymentStatus: input.paymentStatus, professionalValue: settlement.professionalValue, commercialPolicyVersion: settlement.commercialPolicyVersion, commercialTransactionId },
    detail: "Estado financeiro da produção. Opportunity permanece intacta. Sem dados de cartão ou credencial bancária.",
  });
  if (input.paymentStatus === "Pagamento confirmado" || input.paymentStatus === "Pagamento recebido") {
    await createNetworkNotification(db, {
      actorId: actor.id,
      recipientUserId: production.professionalUserId,
      type: "payment_confirmed",
      referenceType: "network-production",
      referenceId: production.id,
      partnerId: production.partnerId,
      territoryId: production.territoryId,
    });
  }
  return { success: true as const, paymentStatus: input.paymentStatus };
}

export async function registerProductionDelivery(db: Db, actor: Actor, input: { productionId: number; mediaIds?: number[] }) {
  requireCommerceAdmin(actor.role);
  const production = (await db.select().from(networkProductions).where(eq(networkProductions.id, input.productionId)).limit(1))[0];
  if (!production) throw new TRPCError({ code: "NOT_FOUND", message: "Produção não encontrada." });
  await assertProductionCommerceScope(db, actor, production);
  if (production.status !== "Concluída") throw new TRPCError({ code: "BAD_REQUEST", message: "Entrega ao cliente só depois da conclusão operacional." });
  const mediaIds = Array.from(new Set(input.mediaIds || []));
  for (const mediaId of mediaIds) {
    try {
      await db.insert(networkProductionDeliveries).values({ productionId: production.id, mediaId, createdBy: actor.id });
      await recordAuditEvent(db, {
        actorId: actor.id,
        partnerId: production.partnerId,
        territoryId: production.territoryId,
        resourceType: "network-production",
        resourceId: production.id,
        action: "delivery_created",
        nextState: { mediaId, publicationAllowed: false },
        detail: "Entrega ao cliente registrada sobre mídia do Acervo. Não publica no portal e não cria galeria comercial.",
      });
    } catch {
      /* vínculo já existe */
    }
  }
  await db.update(networkProductions).set({ deliveredAt: new Date() }).where(eq(networkProductions.id, production.id));
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-production",
    resourceId: production.id,
    action: "delivery_completed",
    nextState: { deliveredAt: true, published: false },
    detail: "Entrega ≠ publicação. Autorização editorial continua obrigatória para a Rede.",
  });
  await createNetworkNotification(db, {
    actorId: actor.id,
    recipientUserId: production.professionalUserId,
    type: "delivery_completed",
    referenceType: "network-production",
    referenceId: production.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
  });
  return { success: true as const, published: false as const };
}
