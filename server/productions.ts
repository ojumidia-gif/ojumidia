import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  commercialEditorialAuthorizations,
  mediaAssets,
  networkOpportunities,
  networkProductionMedia,
  networkProductions,
  uploadSessions,
} from "../drizzle/schema";
import {
  canAttachProductionMedia,
  canSubmitProductionForReview,
  canTransitionProduction,
  productionCanMarkMediaPublic,
  productionMediaWithinLimit,
  productionMineBucket,
} from "@shared/networkProductions";
import { createNetworkNotification } from "./networkNotifications";
import { getProductionSettlement, listProductionDeliveries, registerProductionDelivery } from "./networkCommerce";
import { canUseOnPortal } from "./commercialEditorialAuthorization";
import { assertPartnerScope, recordAuditEvent } from "./partnerScope";
import { professionalProfileForUser } from "./professionalNetwork";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Actor = { id: number; role: string };

export function isMissingProductionSchema(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${error}` : String(error);
  return /networkProductions|networkProductionMedia|ER_NO_SUCH_TABLE|doesn't exist/i.test(text);
}

export function hideProductionSql(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  console.error("[productions]", error);
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível operar a produção agora." });
}

async function withOptionalProductionSchema<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isMissingProductionSchema(error)) return fallback;
    throw error;
  }
}

function requireProductionAdmin(role: string) {
  if (!["administrador", "administrador principal"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente administração autorizada opera produções da Rede." });
  }
}

export function decideOpportunityProductionAccess(input: {
  actor: { id: number; role: string };
  acceptedUserId: number | null;
  acceptedProfessionalProfileId: number | null;
  actorProfessionalProfileId: number | null;
}): "allow" | "partner-admin" | "deny" {
  if (input.actor.role === "administrador principal") return "allow";
  if (input.acceptedUserId === input.actor.id) return "allow";
  if (input.actorProfessionalProfileId && input.acceptedProfessionalProfileId === input.actorProfessionalProfileId) return "allow";
  if (input.actor.role === "administrador") return "partner-admin";
  return "deny";
}

export function decideProductionMediaAttachAccess(input: {
  actorRole: string;
  actorId: number;
  mediaCreatedBy: number;
  mediaPartnerId: number | null;
  productionPartnerId: number | null;
}): "allow" | "partner-admin" | "deny" {
  if (input.actorRole === "administrador principal") return "allow";
  if (input.mediaPartnerId && input.productionPartnerId && input.mediaPartnerId !== input.productionPartnerId) return "deny";
  if (input.mediaCreatedBy === input.actorId) return "allow";
  if (input.actorRole === "administrador") {
    return input.mediaPartnerId ? "partner-admin" : "deny";
  }
  return "deny";
}

async function assertProductionScope(db: Db, actor: Actor, production: typeof networkProductions.$inferSelect) {
  if (actor.role === "administrador principal") return;
  const profile = await professionalProfileForUser(db, actor.id);
  if (profile && profile.id === production.professionalProfileId) return;
  if (production.professionalUserId === actor.id) return;
  requireProductionAdmin(actor.role);
  try {
    await assertPartnerScope({
      db,
      actor,
      partnerId: production.partnerId,
      territoryIds: [production.territoryId],
      resourceLabel: "esta produção",
      requirePartner: Boolean(production.partnerId),
    });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do território autorizado." });
  }
}

async function loadProduction(db: Db, id: number) {
  const production = (await db.select().from(networkProductions).where(eq(networkProductions.id, id)).limit(1))[0];
  if (!production) throw new TRPCError({ code: "NOT_FOUND", message: "Produção não encontrada." });
  return production;
}

async function attachedMedia(db: Db, productionId: number) {
  const links = await db.select().from(networkProductionMedia).where(eq(networkProductionMedia.productionId, productionId));
  const mediaIds = links.map(item => item.mediaId);
  const assets = mediaIds.length ? await db.select().from(mediaAssets).where(inArray(mediaAssets.id, mediaIds)) : [];
  return links.map(link => ({ ...link, media: assets.find(item => item.id === link.mediaId) || null }));
}

export async function createProductionFromAcceptedOpportunity(db: Db, actor: Actor, opportunityId: number) {
  return withOptionalProductionSchema(async () => {
    const opportunity = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, opportunityId)).limit(1))[0];
    if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade não encontrada." });
    const profile = await professionalProfileForUser(db, actor.id);
    const access = decideOpportunityProductionAccess({
      actor,
      acceptedUserId: opportunity.acceptedUserId,
      acceptedProfessionalProfileId: opportunity.acceptedProfessionalProfileId,
      actorProfessionalProfileId: profile?.id ?? null,
    });
    if (access === "deny") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode abrir produção desta oportunidade." });
    }
    if (access === "partner-admin") {
      requireProductionAdmin(actor.role);
      try {
        await assertPartnerScope({
          db,
          actor,
          partnerId: opportunity.partnerId,
          territoryIds: [opportunity.territoryId],
          resourceLabel: "esta oportunidade",
          requirePartner: Boolean(opportunity.partnerId),
        });
      } catch (error) {
        throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do território autorizado." });
      }
    }
    if (opportunity.status !== "Aceita") throw new TRPCError({ code: "BAD_REQUEST", message: "Só a oportunidade aceita vira produção." });
    if (!opportunity.acceptedProfessionalProfileId) throw new TRPCError({ code: "BAD_REQUEST", message: "A produção exige o perfil profissional que aceitou." });
    const existing = (await db.select({ id: networkProductions.id }).from(networkProductions).where(eq(networkProductions.opportunityId, opportunity.id)).limit(1))[0];
    if (existing) return { id: existing.id, created: false as const };
    const inserted = await db.insert(networkProductions).values({
      opportunityId: opportunity.id,
      commercialRequestId: opportunity.commercialRequestId,
      professionalProfileId: opportunity.acceptedProfessionalProfileId,
      professionalUserId: opportunity.acceptedUserId,
      executorId: opportunity.acceptedExecutorId,
      partnerId: opportunity.partnerId,
      territoryId: opportunity.territoryId,
      workType: opportunity.workType,
      title: opportunity.title,
      briefing: opportunity.briefing,
      eventDate: opportunity.eventDate,
      status: "Planejada",
      responsibleUserId: opportunity.responsibleUserId,
      createdBy: actor.id,
    });
    const id = Number(inserted[0].insertId);
    await recordAuditEvent(db, {
      actorId: actor.id,
      partnerId: opportunity.partnerId,
      territoryId: opportunity.territoryId,
      resourceType: "network-production",
      resourceId: id,
      action: "production_created",
      nextState: { opportunityId: opportunity.id, professionalProfileId: opportunity.acceptedProfessionalProfileId, status: "Planejada" },
      detail: "Produção operacional criada a partir da oportunidade aceita. Valores congelados permanecem na oportunidade. Não é portfólio nem pagamento.",
    });
    await createNetworkNotification(db, {
      actorId: actor.id,
      recipientUserId: opportunity.acceptedUserId,
      type: "production_created",
      referenceType: "network-production",
      referenceId: id,
      partnerId: opportunity.partnerId,
      territoryId: opportunity.territoryId,
    });
    if (opportunity.responsibleUserId && opportunity.responsibleUserId !== opportunity.acceptedUserId) {
      await createNetworkNotification(db, {
        actorId: actor.id,
        recipientUserId: opportunity.responsibleUserId,
        type: "production_created",
        referenceType: "network-production",
        referenceId: id,
        partnerId: opportunity.partnerId,
        territoryId: opportunity.territoryId,
      });
    }
    return { id, created: true as const };
  }, null);
}

export async function listProductions(db: Db, actor: Actor) {
  return withOptionalProductionSchema(async () => {
    const rows = await db.select().from(networkProductions).orderBy(desc(networkProductions.updatedAt));
    const visible = [];
    for (const row of rows) {
      try {
        await assertProductionScope(db, actor, row);
        visible.push(row);
      } catch {
        /* fora do escopo */
      }
    }
    return visible;
  }, []);
}

export async function myProductions(db: Db, actor: Actor) {
  return withOptionalProductionSchema(async () => {
    const profile = await professionalProfileForUser(db, actor.id);
    const rows = profile
      ? await db.select().from(networkProductions).where(eq(networkProductions.professionalProfileId, profile.id)).orderBy(desc(networkProductions.updatedAt))
      : actor.role === "administrador principal"
        ? await db.select().from(networkProductions).orderBy(desc(networkProductions.updatedAt))
        : [];
    const buckets: Record<string, typeof rows> = { planejadas: [], confirmadas: [], emProducao: [], aguardandoMidia: [], concluidas: [], encerradas: [] };
    rows.forEach(row => {
      buckets[productionMineBucket(row.status)].push(row);
    });
    return { profile: profile ? { id: profile.id, displayName: profile.displayName } : null, buckets };
  }, { profile: null, buckets: { planejadas: [], confirmadas: [], emProducao: [], aguardandoMidia: [], concluidas: [], encerradas: [] } });
}

export async function getProduction(db: Db, actor: Actor, id: number) {
  const production = await loadProduction(db, id);
  await assertProductionScope(db, actor, production);
  const opportunity = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, production.opportunityId)).limit(1))[0] || null;
  const media = await attachedMedia(db, production.id);
  const authorization = production.commercialRequestId
    ? (await db.select().from(commercialEditorialAuthorizations).where(eq(commercialEditorialAuthorizations.requestId, production.commercialRequestId)).limit(1))[0] || null
    : null;
  return {
    production,
    opportunity: opportunity
      ? {
        id: opportunity.id,
        status: opportunity.status,
        totalValue: opportunity.totalValue,
        professionalValue: opportunity.professionalValue,
        ojuValue: opportunity.ojuValue,
        networkFundValue: opportunity.networkFundValue,
        commercialPolicyId: opportunity.commercialPolicyId,
        commercialPolicyVersion: opportunity.commercialPolicyVersion,
        frozenAt: opportunity.frozenAt,
      }
      : null,
    media: media.map(item => ({
      id: item.id,
      layer: item.layer,
      mediaId: item.mediaId,
      mediaType: item.media?.mediaType,
      durationSeconds: item.media?.durationSeconds,
      publicationAllowed: item.media?.publicationAllowed ?? false,
      authorization: item.media?.authorization,
      territoryId: item.media?.territoryId,
      photographerId: item.media?.photographerId,
      credit: item.media?.credit,
      filename: item.media?.filename,
    })),
    portalAuthorized: canUseOnPortal(authorization),
    settlement: await getProductionSettlement(db, production.id),
    deliveries: await listProductionDeliveries(db, production.id),
  };
}

export async function transitionProduction(db: Db, actor: Actor, input: { id: number; status: typeof networkProductions.$inferSelect["status"]; notes?: string | null }) {
  const production = await loadProduction(db, input.id);
  await assertProductionScope(db, actor, production);
  if (production.status === "Cancelada") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Produção cancelada não continua como fluxo ativo." });
  }
  if (!canTransitionProduction(production.status, input.status)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Não é possível passar de ${production.status} para ${input.status}.` });
  }
  const values: Partial<typeof networkProductions.$inferInsert> = { status: input.status, notes: input.notes === undefined ? production.notes : input.notes };
  let action = "production_updated";
  if (input.status === "Em produção") {
    values.startedAt = production.startedAt ?? new Date();
    action = "production_started";
  }
  if (input.status === "Cancelada") {
    values.cancelledAt = new Date();
    action = "production_cancelled";
  }
  if (input.status === "Concluída") {
    const media = await attachedMedia(db, production.id);
    if (!media.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Conclusão exige mídia recebida. A janela continua limitada a 5 JPG e 1 miniclip." });
    values.completedAt = new Date();
    action = "production_completed";
  }
  await db.update(networkProductions).set(values).where(eq(networkProductions.id, production.id));
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-production",
    resourceId: production.id,
    action,
    previousState: { status: production.status },
    nextState: { status: input.status },
    detail: "Ciclo operacional da produção. Não altera valores congelados da oportunidade e não publica mídia.",
  });
  if (input.status === "Em produção") {
    await createNetworkNotification(db, {
      actorId: actor.id,
      recipientUserId: production.professionalUserId,
      type: "production_started",
      referenceType: "network-production",
      referenceId: production.id,
      partnerId: production.partnerId,
      territoryId: production.territoryId,
    });
  }
  return { success: true as const };
}

export async function attachProductionMedia(db: Db, actor: Actor, input: { productionId: number; mediaId: number; layer?: "Operacional" | "Editorial" }) {
  const production = await loadProduction(db, input.productionId);
  await assertProductionScope(db, actor, production);
  if (!canAttachProductionMedia(production.status)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Produção cancelada ou encerrada não recebe nova mídia neste fluxo." });
  }
  const media = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.mediaId)).limit(1))[0];
  if (!media || media.deletedAt || media.state !== "Ativo") throw new TRPCError({ code: "BAD_REQUEST", message: "Use uma mídia ativa do Acervo existente. Não há segundo sistema de arquivos." });
  const attachAccess = decideProductionMediaAttachAccess({
    actorRole: actor.role,
    actorId: actor.id,
    mediaCreatedBy: media.createdBy,
    mediaPartnerId: media.partnerId,
    productionPartnerId: production.partnerId,
  });
  if (attachAccess === "deny") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta mídia não pode ser ligada a esta produção." });
  }
  if (attachAccess === "partner-admin") {
    try {
      await assertPartnerScope({
        db,
        actor,
        partnerId: media.partnerId,
        territoryIds: media.territoryId ? [media.territoryId] : [],
        resourceLabel: "esta mídia",
        requirePartner: true,
      });
    } catch (error) {
      throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do território autorizado." });
    }
  }
  const already = (await db.select().from(networkProductionMedia).where(eq(networkProductionMedia.mediaId, media.id)).limit(1))[0];
  if (already && already.productionId !== production.id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Esta mídia já está ligada a outra produção." });
  }
  const current = await attachedMedia(db, production.id);
  if (current.some(item => item.mediaId === media.id)) throw new TRPCError({ code: "BAD_REQUEST", message: "Esta mídia já está nesta produção." });
  const limit = productionMediaWithinLimit({
    mediaType: media.mediaType,
    durationSeconds: media.durationSeconds,
    attachedPhotoCount: current.filter(item => item.media?.mediaType === "foto").length,
    attachedVideoCount: current.filter(item => item.media?.mediaType === "vídeo").length,
  });
  if (!limit.ok) throw new TRPCError({ code: "BAD_REQUEST", message: limit.message });
  await db.insert(networkProductionMedia).values({
    productionId: production.id,
    mediaId: media.id,
    layer: input.layer || "Editorial",
    displayOrder: current.length,
    attachedBy: actor.id,
  });
  await db.update(mediaAssets).set({
    partnerId: media.partnerId ?? production.partnerId,
    territoryId: media.territoryId ?? production.territoryId,
    photographerId: media.photographerId ?? production.executorId,
  }).where(eq(mediaAssets.id, media.id));
  if (production.status === "Confirmada" || production.status === "Em produção") {
    await db.update(networkProductions).set({ status: "Aguardando mídia" }).where(eq(networkProductions.id, production.id));
  }
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-production",
    resourceId: production.id,
    action: "media_attached",
    nextState: { mediaId: media.id, publicationAllowed: media.publicationAllowed, layer: input.layer || "Editorial" },
    detail: "Mídia do Acervo ligada à produção. Envio não torna pública. Janela da Rede: até 5 JPG e 1 miniclip de 60s.",
  });
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-production",
    resourceId: production.id,
    action: "production_media_received",
    nextState: { mediaId: media.id },
    detail: "Mídia recebida no contexto da produção territorial.",
  });
  return { success: true as const, publicationAllowed: media.publicationAllowed };
}

export async function registerOperationalProductionMedia(db: Db, actor: Actor, input: {
  productionId: number;
  mediaType: "foto" | "vídeo";
  assetUrl: string;
  storageKey?: string;
  filename?: string;
  origin: string;
  credit: string;
  authorization: "Cessão" | "Licença" | "Domínio público" | "Autoral própria" | "Pendente";
  purpose: string;
  durationSeconds?: number;
  uploadId?: string;
}) {
  const production = await loadProduction(db, input.productionId);
  await assertProductionScope(db, actor, production);
  if (!input.uploadId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Conclua um upload seu antes de registrar a mídia da produção." });
  }
  const upload = (await db.select().from(uploadSessions).where(eq(uploadSessions.id, input.uploadId)).limit(1))[0];
  if (!upload || upload.userId !== actor.id || !["Pronto", "Aprovado", "Publicado"].includes(upload.status) || !upload.assetUrl || !upload.storageKey) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Conclua um upload seu antes de registrar a mídia da produção." });
  }
  if (upload.assetUrl !== input.assetUrl || (input.storageKey && upload.storageKey !== input.storageKey)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A referência da mídia não corresponde à sessão de upload concluída." });
  }
  const inserted = await db.insert(mediaAssets).values({
    mediaType: input.mediaType,
    assetUrl: upload.assetUrl,
    storageKey: upload.storageKey,
    filename: input.filename ?? upload.filename,
    origin: input.origin,
    credit: input.credit,
    authorization: input.authorization,
    purpose: input.purpose,
    publicationAllowed: false,
    durationSeconds: input.durationSeconds ?? upload.durationSeconds,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    uploadId: upload.id,
    createdBy: actor.id,
  });
  const mediaId = Number(inserted[0].insertId);
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "media",
    resourceId: mediaId,
    action: "media-registered",
    nextState: { productionId: production.id, publicationAllowed: false, authorization: input.authorization },
    detail: "Mídia operacional da produção. publicationAllowed e o enum de autorização não são assinatura formal nem gov.br.",
  });
  return { ...await attachProductionMedia(db, actor, { productionId: production.id, mediaId, layer: "Operacional" }), mediaId };
}

export async function detachProductionMedia(db: Db, actor: Actor, input: { productionId: number; mediaId: number }) {
  const production = await loadProduction(db, input.productionId);
  await assertProductionScope(db, actor, production);
  if (production.status === "Concluída" || production.status === "Cancelada") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Produção encerrada não altera a janela de mídia neste fluxo." });
  }
  await db.delete(networkProductionMedia).where(and(eq(networkProductionMedia.productionId, production.id), eq(networkProductionMedia.mediaId, input.mediaId)));
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-production",
    resourceId: production.id,
    action: "media_removed",
    nextState: { mediaId: input.mediaId },
    detail: "Vínculo de mídia removido da produção. O arquivo permanece no Acervo.",
  });
  return { success: true as const };
}

export async function submitProductionForReview(db: Db, actor: Actor, id: number) {
  const production = await loadProduction(db, id);
  await assertProductionScope(db, actor, production);
  const media = await attachedMedia(db, production.id);
  if (!canSubmitProductionForReview(production.status, media.length)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Envie ao menos uma mídia do Acervo antes da revisão." });
  }
  await db.update(networkProductions).set({ status: "Em revisão", submittedAt: new Date() }).where(eq(networkProductions.id, production.id));
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-production",
    resourceId: production.id,
    action: "production_submitted_for_review",
    previousState: { status: production.status },
    nextState: { status: "Em revisão" },
    detail: "Produção em revisão. Mídia continua privada até autorização e curadoria.",
  });
  await createNetworkNotification(db, {
    actorId: actor.id,
    recipientUserId: production.responsibleUserId,
    type: "production_review_requested",
    referenceType: "network-production",
    referenceId: production.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
  });
  await createNetworkNotification(db, {
    actorId: actor.id,
    recipientUserId: production.responsibleUserId,
    type: "production_media_review",
    referenceType: "network-production",
    referenceId: production.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
  });
  return { success: true as const };
}

export async function approveProductionReview(db: Db, actor: Actor, id: number) {
  requireProductionAdmin(actor.role);
  const production = await loadProduction(db, id);
  await assertProductionScope(db, actor, production);
  if (production.status !== "Em revisão") throw new TRPCError({ code: "BAD_REQUEST", message: "Só revisão pendente pode ser aprovada." });
  const media = await attachedMedia(db, production.id);
  const authorization = production.commercialRequestId
    ? (await db.select().from(commercialEditorialAuthorizations).where(eq(commercialEditorialAuthorizations.requestId, production.commercialRequestId)).limit(1))[0] || null
    : null;
  const portalAuthorized = canUseOnPortal(authorization);
  const editorialReady = media.every(item => item.media && productionCanMarkMediaPublic({
    productionStatus: "Em revisão",
    mediaPublicationAllowed: item.media.publicationAllowed,
    mediaAuthorization: item.media.authorization,
    portalAuthorization: production.commercialRequestId ? portalAuthorized : item.media.authorization !== "Pendente" && item.media.publicationAllowed,
  }));
  await db.update(networkProductions).set({
    status: "Concluída",
    completedAt: new Date(),
    editorialReady,
  }).where(eq(networkProductions.id, production.id));
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-production",
    resourceId: production.id,
    action: "production_approved",
    nextState: { status: "Concluída", editorialReady, portalAuthorized },
    detail: "Revisão operacional aprovada. Conclusão não publica no portal. Autorização editorial continua obrigatória.",
  });
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
    resourceType: "network-production",
    resourceId: production.id,
    action: "production_completed",
    nextState: { editorialReady },
    detail: "Produção concluída. Opportunity permanece com política e valores congelados.",
  });
  await createNetworkNotification(db, {
    actorId: actor.id,
    recipientUserId: production.professionalUserId,
    type: "production_completed",
    referenceType: "network-production",
    referenceId: production.id,
    partnerId: production.partnerId,
    territoryId: production.territoryId,
  });
  if (editorialReady) {
    await recordAuditEvent(db, {
      actorId: actor.id,
      partnerId: production.partnerId,
      territoryId: production.territoryId,
      resourceType: "network-production",
      resourceId: production.id,
      action: "publication_approved",
      nextState: { editorialReady: true },
      detail: "Janela apta para curadoria. Publicação contextual ainda é o fluxo editorial existente.",
    });
  }
  return { success: true as const, editorialReady, published: false };
}

export async function markProductionDelivered(db: Db, actor: Actor, id: number, mediaIds?: number[]) {
  return registerProductionDelivery(db, actor, { productionId: id, mediaIds });
}

export async function linkProductionPublication(db: Db, actor: Actor, input: { productionId: number; publicationId: number }) {
  requireProductionAdmin(actor.role);
  const production = await loadProduction(db, input.productionId);
  await assertProductionScope(db, actor, production);
  if (!production.editorialReady) throw new TRPCError({ code: "BAD_REQUEST", message: "A produção ainda não está apta para publicação contextual. Autorização e curadoria continuam obrigatórias." });
  await db.update(networkProductions).set({ publicationId: input.publicationId }).where(eq(networkProductions.id, production.id));
  return { success: true as const };
}
