import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  commercialPolicies,
  commercialRequests,
  networkExecutors,
  networkOpportunities,
  networkOpportunityInvites,
  networkOpportunitySpecialties,
  partnerTerritories,
  professionalProfiles,
  professionalProfileSpecialties,
  taxonomies,
} from "../drizzle/schema";
import {
  assertKnownSpecialties,
  canAcceptInvite,
  canMutateOpportunityEconomics,
  derivedOpportunityStatus,
  inviteStatusesAfterAccept,
  isInviteExpired,
  policyScopeForWorkType,
  matchProfessionalForOpportunity,
  professionalEligibleForOpportunity,
  professionalMineBucket,
  specialtiesFromCommercialNeeds,
  splitOpportunityEconomics,
  workTypeFromCommercialNeeds,
  type OpportunityOrigin,
  type OpportunityWorkType,
} from "@shared/networkOpportunities";
import { decodeSpecialties } from "@shared/professionalSpecialties";
import { assertPartnerScope, partnerTerritoryIds, recordAuditEvent } from "./partnerScope";
import { professionalProfileForUser } from "./professionalNetwork";
import { createNetworkNotification } from "./networkNotifications";
import { createProductionFromAcceptedOpportunity } from "./productions";
import { briefingWithoutOrigin, parseOriginFromNotes } from "./professionalOrigination";
import { activeCommercialPolicy } from "./financialGovernance";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Actor = { id: number; role: string };

export function isMissingOpportunitySchema(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${error}` : String(error);
  return /networkOpportunities|networkOpportunityInvites|networkOpportunitySpecialties|ER_NO_SUCH_TABLE|doesn't exist/i.test(text);
}

export function hideOpportunitySql(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  console.error("[opportunities]", error);
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível operar a oportunidade agora." });
}

async function withOptionalOpportunitySchema<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isMissingOpportunitySchema(error)) return fallback;
    throw error;
  }
}

function requireOpportunityAdmin(role: string) {
  if (!["administrador", "administrador principal"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente administração autorizada opera oportunidades da Rede." });
  }
}

function decimal(value: number) {
  return value.toFixed(2);
}

function parseUfAndCity(territoryName: string) {
  const match = territoryName.match(/^(.*?)(?:\s*[—,-]\s*|\s+)([A-Za-z]{2})\s*$/);
  if (match) return { cityLabel: match[1].trim().slice(0, 180) || territoryName.slice(0, 180), uf: match[2].toUpperCase() };
  return { cityLabel: territoryName.slice(0, 180), uf: "BR" };
}

async function territoryRow(db: Db, territoryId: number) {
  const row = (await db.select({ id: taxonomies.id, name: taxonomies.name }).from(taxonomies).where(and(eq(taxonomies.id, territoryId), eq(taxonomies.dimension, "Território"))).limit(1))[0];
  if (!row) throw new TRPCError({ code: "BAD_REQUEST", message: "A oportunidade precisa de um território estruturado. Texto livre de cidade não define elegibilidade." });
  return row;
}

async function replaceOpportunitySpecialties(db: Db, opportunityId: number, specialtyIds: string[]) {
  const ids = assertKnownSpecialties(specialtyIds);
  await db.delete(networkOpportunitySpecialties).where(eq(networkOpportunitySpecialties.opportunityId, opportunityId));
  await db.insert(networkOpportunitySpecialties).values(ids.map(specialtyId => ({ opportunityId, specialtyId })));
  return ids;
}

async function economicsFromPolicy(db: Db, workType: string, totalValue: number) {
  const policy = await activeCommercialPolicy(db, policyScopeForWorkType(workType));
  if (!policy) throw new TRPCError({ code: "BAD_REQUEST", message: "Ative uma política comercial persistida para este tipo de trabalho antes de abrir a oportunidade. Percentuais não são inventados no código." });
  const split = splitOpportunityEconomics(totalValue, policy);
  return { policy, split };
}

async function authorizedTerritoryIdsForProfile(db: Db, profile: { partnerId: number | null; territoryId: number | null }) {
  const ids = new Set<number>();
  if (profile.territoryId) ids.add(profile.territoryId);
  if (profile.partnerId) {
    const partnerIds = await partnerTerritoryIds(db, profile.partnerId);
    partnerIds.forEach(id => ids.add(id));
  }
  return Array.from(ids);
}

async function loadOpportunityBundle(db: Db, opportunityId: number) {
  const opportunity = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, opportunityId)).limit(1))[0];
  if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade não encontrada." });
  const specialties = await db.select().from(networkOpportunitySpecialties).where(eq(networkOpportunitySpecialties.opportunityId, opportunityId));
  const invites = await db.select().from(networkOpportunityInvites).where(eq(networkOpportunityInvites.opportunityId, opportunityId));
  return { opportunity, specialtyIds: specialties.map(item => item.specialtyId), invites };
}

function publicOpportunityView(opportunity: typeof networkOpportunities.$inferSelect, specialtyIds: string[]) {
  return {
    id: opportunity.id,
    title: opportunity.title,
    briefing: opportunity.briefing,
    workType: opportunity.workType,
    territoryId: opportunity.territoryId,
    cityLabel: opportunity.cityLabel,
    uf: opportunity.uf,
    eventDate: opportunity.eventDate,
    startAt: opportunity.startAt,
    endAt: opportunity.endAt,
    durationText: opportunity.durationText,
    totalValue: opportunity.totalValue,
    professionalValue: opportunity.professionalValue,
    ojuValue: opportunity.ojuValue,
    networkFundValue: opportunity.networkFundValue,
    commercialPolicyId: opportunity.commercialPolicyId,
    commercialPolicyVersion: opportunity.commercialPolicyVersion,
    executorPercent: opportunity.executorPercent,
    status: opportunity.status,
    acceptanceDeadline: opportunity.acceptanceDeadline,
    specialties: decodeSpecialties(specialtyIds.join(" · ")),
  };
}

export async function createNetworkOpportunity(db: Db, actor: Actor, input: {
  commercialRequestId?: number | null;
  title: string;
  briefing: string;
  workType: OpportunityWorkType;
  origin?: OpportunityOrigin;
  territoryId: number;
  partnerId?: number | null;
  eventDate?: Date | null;
  startAt?: Date | null;
  endAt?: Date | null;
  durationText?: string | null;
  totalValue: number;
  specialtyIds: string[];
  acceptanceDeadline?: Date | null;
}) {
  requireOpportunityAdmin(actor.role);
  try {
    await assertPartnerScope({ db, actor, partnerId: input.partnerId ?? null, territoryIds: [input.territoryId], resourceLabel: "esta oportunidade", requirePartner: actor.role !== "administrador principal" });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do escopo territorial." });
  }
  const territory = await territoryRow(db, input.territoryId);
  const place = parseUfAndCity(territory.name);
  const { policy, split } = await economicsFromPolicy(db, input.workType, input.totalValue);
  let origin: OpportunityOrigin = input.origin || "Manual";
  let commercialRequestId = input.commercialRequestId ?? null;
  let requestOrigin = null as ReturnType<typeof parseOriginFromNotes>;
  if (commercialRequestId) {
    const request = (await db.select({ id: commercialRequests.id, notes: commercialRequests.notes }).from(commercialRequests).where(eq(commercialRequests.id, commercialRequestId)).limit(1))[0];
    if (!request) throw new TRPCError({ code: "BAD_REQUEST", message: "A solicitação comercial informada não existe. A oportunidade não substitui o pedido do cliente." });
    origin = "Comercial";
    requestOrigin = parseOriginFromNotes(request.notes);
  }
  const inserted = await db.insert(networkOpportunities).values({
    commercialRequestId,
    title: input.title.trim().slice(0, 240),
    briefing: input.briefing.trim(),
    workType: input.workType,
    origin,
    territoryId: input.territoryId,
    partnerId: input.partnerId ?? null,
    cityLabel: place.cityLabel,
    uf: place.uf === "BR" ? place.uf : place.uf.slice(0, 2),
    eventDate: input.eventDate ?? null,
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    durationText: input.durationText?.trim() || null,
    totalValue: decimal(split.totalValue),
    professionalValue: decimal(split.professionalValue),
    ojuValue: decimal(split.ojuValue),
    networkFundValue: decimal(split.networkFundValue),
    captorValue: decimal(split.captorValue),
    executorPercent: decimal(split.executorPercent),
    ojuPercent: decimal(split.ojuPercent),
    developmentPercent: decimal(split.developmentPercent),
    captorPercent: decimal(split.captorPercent),
    commercialPolicyId: policy.id,
    commercialPolicyVersion: policy.version,
    status: "Rascunho",
    acceptanceDeadline: input.acceptanceDeadline ?? null,
    createdBy: actor.id,
    responsibleUserId: actor.id,
  });
  const id = Number(inserted[0].insertId);
  const specialtyIds = await replaceOpportunitySpecialties(db, id, input.specialtyIds);
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: input.partnerId ?? null,
    territoryId: input.territoryId,
    resourceType: "network-opportunity",
    resourceId: id,
    action: "opportunity_created",
    nextState: { status: "Rascunho", commercialRequestId, specialtyIds, commercialPolicyId: policy.id, commercialPolicyVersion: policy.version, totalValue: split.totalValue, professionalValue: split.professionalValue, createdByUserId: actor.id, originatedByProfessionalProfileId: requestOrigin?.originatedByProfessionalProfileId ?? null, originKind: requestOrigin?.kind ?? null, published: false, homeFeatured: false },
    detail: "Oportunidade da Rede criada. Não é pagamento. createdBy é quem registrou; originatedBy, se houver, veio da solicitação. Especialidade e território não alteram users.role.",
  });
  return { id, specialtyIds, commercialPolicyId: policy.id, commercialPolicyVersion: policy.version, economics: split };
}

export async function createOpportunityFromCommercialRequest(db: Db, actor: Actor, input: { requestId: number; totalValue: number; partnerId?: number | null; acceptanceDeadline?: Date | null }) {
  const request = (await db.select().from(commercialRequests).where(eq(commercialRequests.id, input.requestId)).limit(1))[0];
  if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação comercial não encontrada." });
  const specialtyIds = specialtiesFromCommercialNeeds(request);
  const workType = workTypeFromCommercialNeeds(request);
  const territoryId = request.territoryId;
  if (!territoryId) throw new TRPCError({ code: "BAD_REQUEST", message: "A solicitação precisa de território estruturado antes de virar oportunidade." });
  return createNetworkOpportunity(db, actor, {
    commercialRequestId: request.id,
    title: request.eventType.slice(0, 240),
    briefing: briefingWithoutOrigin(request.objective, request.notes) || request.eventType,
    workType,
    origin: "Comercial",
    territoryId,
    partnerId: input.partnerId ?? request.partnerId,
    eventDate: request.eventDate,
    durationText: request.duration,
    totalValue: input.totalValue,
    specialtyIds: specialtyIds.length ? specialtyIds : ["fotografo"],
    acceptanceDeadline: input.acceptanceDeadline ?? null,
  });
}

export async function updateNetworkOpportunity(db: Db, actor: Actor, input: {
  id: number;
  title?: string;
  briefing?: string;
  eventDate?: Date | null;
  startAt?: Date | null;
  endAt?: Date | null;
  durationText?: string | null;
  totalValue?: number;
  specialtyIds?: string[];
  acceptanceDeadline?: Date | null;
  status?: "Rascunho" | "Aberta";
}) {
  requireOpportunityAdmin(actor.role);
  const current = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, input.id)).limit(1))[0];
  if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade não encontrada." });
  try {
    await assertPartnerScope({ db, actor, partnerId: current.partnerId, territoryIds: [current.territoryId], resourceLabel: "esta oportunidade", requirePartner: actor.role !== "administrador principal" && Boolean(current.partnerId) });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do escopo territorial." });
  }
  if (current.status === "Aceita" || current.frozenAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Depois do aceite a composição econômica e o briefing desta oportunidade ficam congelados." });
  }
  if (current.status === "Cancelada" || current.status === "Expirada") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Oportunidade encerrada não pode ser alterada." });
  }
  const values: Partial<typeof networkOpportunities.$inferInsert> = {};
  if (input.title) values.title = input.title.trim().slice(0, 240);
  if (input.briefing) values.briefing = input.briefing.trim();
  if (input.eventDate !== undefined) values.eventDate = input.eventDate;
  if (input.startAt !== undefined) values.startAt = input.startAt;
  if (input.endAt !== undefined) values.endAt = input.endAt;
  if (input.durationText !== undefined) values.durationText = input.durationText?.trim() || null;
  if (input.acceptanceDeadline !== undefined) values.acceptanceDeadline = input.acceptanceDeadline;
  if (input.status && (input.status === "Rascunho" || input.status === "Aberta")) values.status = input.status;
  if (input.totalValue !== undefined) {
    if (!canMutateOpportunityEconomics(current.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "O valor não pode ser alterado neste estado." });
    const { policy, split } = await economicsFromPolicy(db, current.workType, input.totalValue);
    values.totalValue = decimal(split.totalValue);
    values.professionalValue = decimal(split.professionalValue);
    values.ojuValue = decimal(split.ojuValue);
    values.networkFundValue = decimal(split.networkFundValue);
    values.captorValue = decimal(split.captorValue);
    values.executorPercent = decimal(split.executorPercent);
    values.ojuPercent = decimal(split.ojuPercent);
    values.developmentPercent = decimal(split.developmentPercent);
    values.captorPercent = decimal(split.captorPercent);
    values.commercialPolicyId = policy.id;
    values.commercialPolicyVersion = policy.version;
  }
  if (Object.keys(values).length) await db.update(networkOpportunities).set(values).where(eq(networkOpportunities.id, current.id));
  if (input.specialtyIds) await replaceOpportunitySpecialties(db, current.id, input.specialtyIds);
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: current.partnerId,
    territoryId: current.territoryId,
    resourceType: "network-opportunity",
    resourceId: current.id,
    action: "opportunity_updated",
    previousState: { status: current.status, totalValue: current.totalValue },
    nextState: { status: values.status || current.status, totalValue: values.totalValue || current.totalValue },
    detail: "Oportunidade atualizada antes do aceite. Política e valores só mudam enquanto não aceita.",
  });
  return { success: true as const };
}

export async function cancelNetworkOpportunity(db: Db, actor: Actor, id: number) {
  requireOpportunityAdmin(actor.role);
  const current = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, id)).limit(1))[0];
  if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade não encontrada." });
  try {
    await assertPartnerScope({ db, actor, partnerId: current.partnerId, territoryIds: [current.territoryId], resourceLabel: "esta oportunidade", requirePartner: actor.role !== "administrador principal" && Boolean(current.partnerId) });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do escopo territorial." });
  }
  if (current.status === "Aceita") throw new TRPCError({ code: "BAD_REQUEST", message: "Oportunidade aceita não pode ser cancelada. Encerrar a produção correspondente." });
  const pending = await db.select().from(networkOpportunityInvites).where(and(eq(networkOpportunityInvites.opportunityId, id), eq(networkOpportunityInvites.status, "Pendente")));
  await db.update(networkOpportunities).set({ status: "Cancelada" }).where(eq(networkOpportunities.id, id));
  await db.update(networkOpportunityInvites).set({ status: "Cancelada" }).where(and(eq(networkOpportunityInvites.opportunityId, id), eq(networkOpportunityInvites.status, "Pendente")));
  await recordAuditEvent(db, { actorId: actor.id, partnerId: current.partnerId, territoryId: current.territoryId, resourceType: "network-opportunity", resourceId: id, action: "opportunity_cancelled", previousState: { status: current.status }, nextState: { status: "Cancelada" }, detail: "Oportunidade cancelada. Convites pendentes encerrados." });
  for (const invite of pending) {
    await createNetworkNotification(db, {
      actorId: actor.id,
      recipientUserId: invite.userId,
      type: "opportunity_cancelled",
      referenceType: "network-opportunity",
      referenceId: id,
      partnerId: current.partnerId,
      territoryId: current.territoryId,
    });
  }
  return { success: true as const };
}

export async function inviteToOpportunity(db: Db, actor: Actor, input: { opportunityId: number; professionalProfileId: number; expiresAt?: Date | null }) {
  requireOpportunityAdmin(actor.role);
  const bundle = await loadOpportunityBundle(db, input.opportunityId);
  try {
    await assertPartnerScope({ db, actor, partnerId: bundle.opportunity.partnerId, territoryIds: [bundle.opportunity.territoryId], resourceLabel: "este convite", requirePartner: actor.role !== "administrador principal" && Boolean(bundle.opportunity.partnerId) });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do escopo territorial." });
  }
  if (bundle.opportunity.status === "Rascunho") {
    await db.update(networkOpportunities).set({ status: "Aberta" }).where(eq(networkOpportunities.id, bundle.opportunity.id));
  }
  const live = derivedOpportunityStatus(bundle.opportunity.status === "Rascunho" ? { ...bundle.opportunity, status: "Aberta" } : bundle.opportunity);
  if (live !== "Aberta" && bundle.opportunity.status !== "Rascunho") throw new TRPCError({ code: "BAD_REQUEST", message: "Só convites para oportunidade aberta." });
  const profile = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.id, input.professionalProfileId)).limit(1))[0];
  if (!profile) throw new TRPCError({ code: "BAD_REQUEST", message: "Convide pelo perfil profissional. users.role e practice não são a identidade da Rede." });
  const specialtyRows = await db.select().from(professionalProfileSpecialties).where(eq(professionalProfileSpecialties.profileId, profile.id));
  const authorizedTerritoryIds = await authorizedTerritoryIdsForProfile(db, profile);
  if (!professionalEligibleForOpportunity({
    profileStatus: profile.status,
    networkBond: profile.networkBond,
    specialtyIds: specialtyRows.map(item => item.specialtyId),
    authorizedTerritoryIds,
    opportunityTerritoryId: bundle.opportunity.territoryId,
    requiredSpecialtyIds: bundle.specialtyIds,
  })) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Este profissional não é elegível: especialidade, território e vínculo ativo são obrigatórios." });
  }
  const executor = profile.email
    ? (await db.select({ id: networkExecutors.id }).from(networkExecutors).where(eq(networkExecutors.professionalProfileId, profile.id)).limit(1))[0]
    : undefined;
  const existing = bundle.invites.find(item => item.professionalProfileId === profile.id);
  const expiresAt = input.expiresAt ?? bundle.opportunity.acceptanceDeadline ?? null;
  if (existing) {
    await db.update(networkOpportunityInvites).set({ status: "Pendente", expiresAt, invitedAt: new Date(), respondedAt: null, declineReason: null, userId: profile.userId, executorId: executor?.id ?? existing.executorId }).where(eq(networkOpportunityInvites.id, existing.id));
  } else {
    await db.insert(networkOpportunityInvites).values({
      opportunityId: bundle.opportunity.id,
      professionalProfileId: profile.id,
      userId: profile.userId,
      executorId: executor?.id ?? null,
      status: "Pendente",
      expiresAt,
      createdBy: actor.id,
    });
  }
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: bundle.opportunity.partnerId,
    territoryId: bundle.opportunity.territoryId,
    resourceType: "network-opportunity",
    resourceId: bundle.opportunity.id,
    action: "opportunity_invite_created",
    nextState: { professionalProfileId: profile.id, userId: profile.userId, inviteStatus: "Pendente" },
    detail: "Convite enviado ao perfil profissional. Sem ranking e sem marketplace público.",
  });
  await createNetworkNotification(db, {
    actorId: actor.id,
    recipientUserId: profile.userId,
    type: "opportunity_invite",
    referenceType: "network-opportunity",
    referenceId: bundle.opportunity.id,
    partnerId: bundle.opportunity.partnerId,
    territoryId: bundle.opportunity.territoryId,
  });
  return { success: true as const, professionalProfileId: profile.id };
}

export async function acceptOpportunityInvite(db: Db, actor: Actor, inviteId: number) {
  const profile = await professionalProfileForUser(db, actor.id);
  if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "Aceite exige perfil profissional ativo. Especialidade não cria permissão administrativa." });
  const invite = (await db.select().from(networkOpportunityInvites).where(eq(networkOpportunityInvites.id, inviteId)).limit(1))[0];
  if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado." });
  const opportunity = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, invite.opportunityId)).limit(1))[0];
  if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade não encontrada." });
  const decision = canAcceptInvite({
    opportunityStatus: opportunity.status,
    opportunityAcceptanceDeadline: opportunity.acceptanceDeadline,
    inviteStatus: invite.status,
    inviteExpiresAt: invite.expiresAt,
    inviteProfileId: invite.professionalProfileId,
    actorProfileId: profile.id,
  });
  if (!decision.ok) throw new TRPCError({ code: decision.code === "WRONG_RECIPIENT" ? "FORBIDDEN" : "BAD_REQUEST", message: decision.message });
  const claimed = await db.update(networkOpportunities).set({
    status: "Aceita",
    acceptedProfessionalProfileId: profile.id,
    acceptedUserId: actor.id,
    acceptedExecutorId: invite.executorId,
    acceptedAt: new Date(),
    frozenAt: new Date(),
  }).where(and(eq(networkOpportunities.id, opportunity.id), eq(networkOpportunities.status, "Aberta")));
  if (!claimed[0]?.affectedRows) {
    throw new TRPCError({ code: "CONFLICT", message: "Esta oportunidade já foi aceita por outra pessoa." });
  }
  const others = await db.select({ id: networkOpportunityInvites.id, status: networkOpportunityInvites.status }).from(networkOpportunityInvites).where(eq(networkOpportunityInvites.opportunityId, opportunity.id));
  const nextInvites = inviteStatusesAfterAccept(invite.id, others);
  await db.update(networkOpportunityInvites).set({ status: "Aceita", respondedAt: new Date() }).where(eq(networkOpportunityInvites.id, invite.id));
  const superseded = nextInvites.filter(item => item.status === "Superada").map(item => item.id);
  if (superseded.length) {
    await db.update(networkOpportunityInvites).set({ status: "Superada", respondedAt: new Date() }).where(inArray(networkOpportunityInvites.id, superseded));
  }
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: opportunity.partnerId,
    territoryId: opportunity.territoryId,
    resourceType: "network-opportunity",
    resourceId: opportunity.id,
    action: "opportunity_invite_accepted",
    nextState: {
      professionalProfileId: profile.id,
      commercialPolicyId: opportunity.commercialPolicyId,
      commercialPolicyVersion: opportunity.commercialPolicyVersion,
      totalValue: opportunity.totalValue,
      professionalValue: opportunity.professionalValue,
      frozen: true,
    },
    detail: "Aceite atômico. Política e valores congelados. Produção operacional pode ser aberta sem alterar esses valores.",
  });
  const production = await createProductionFromAcceptedOpportunity(db, actor, opportunity.id);
  await createNetworkNotification(db, {
    actorId: actor.id,
    recipientUserId: opportunity.responsibleUserId,
    type: "opportunity_invite_accepted",
    referenceType: "network-opportunity",
    referenceId: opportunity.id,
    partnerId: opportunity.partnerId,
    territoryId: opportunity.territoryId,
  });
  return { success: true as const, opportunityId: opportunity.id, productionId: production?.id ?? null };
}

export async function declineOpportunityInvite(db: Db, actor: Actor, inviteId: number, reason?: string | null) {
  const profile = await professionalProfileForUser(db, actor.id);
  if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "Recusa exige perfil profissional." });
  const invite = (await db.select().from(networkOpportunityInvites).where(eq(networkOpportunityInvites.id, inviteId)).limit(1))[0];
  if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado." });
  if (invite.professionalProfileId !== profile.id) throw new TRPCError({ code: "FORBIDDEN", message: "Este convite não é seu." });
  if (invite.status !== "Pendente") throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite não está pendente." });
  const opportunity = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, invite.opportunityId)).limit(1))[0];
  if (opportunity && (opportunity.status === "Cancelada" || derivedOpportunityStatus(opportunity) === "Expirada" || isInviteExpired(invite.expiresAt))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Convite encerrado não pode ser recusado." });
  }
  await db.update(networkOpportunityInvites).set({ status: "Recusada", respondedAt: new Date(), declineReason: reason?.trim().slice(0, 480) || null }).where(eq(networkOpportunityInvites.id, invite.id));
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: opportunity?.partnerId,
    territoryId: opportunity?.territoryId,
    resourceType: "network-opportunity",
    resourceId: invite.opportunityId,
    action: "opportunity_invite_declined",
    nextState: { professionalProfileId: profile.id, inviteId: invite.id },
    detail: "Profissional recusou o convite da oportunidade.",
  });
  await createNetworkNotification(db, {
    actorId: actor.id,
    recipientUserId: opportunity?.responsibleUserId,
    type: "opportunity_invite_declined",
    referenceType: "network-opportunity",
    referenceId: invite.opportunityId,
    partnerId: opportunity?.partnerId,
    territoryId: opportunity?.territoryId,
  });
  return { success: true as const };
}

export async function expireOpenOpportunities(db: Db, now = new Date()) {
  const open = await db.select().from(networkOpportunities).where(eq(networkOpportunities.status, "Aberta"));
  const expired = open.filter(item => derivedOpportunityStatus(item, now) === "Expirada");
  for (const item of expired) {
    const pending = await db.select().from(networkOpportunityInvites).where(and(eq(networkOpportunityInvites.opportunityId, item.id), eq(networkOpportunityInvites.status, "Pendente")));
    await db.update(networkOpportunities).set({ status: "Expirada" }).where(and(eq(networkOpportunities.id, item.id), eq(networkOpportunities.status, "Aberta")));
    await db.update(networkOpportunityInvites).set({ status: "Expirada" }).where(and(eq(networkOpportunityInvites.opportunityId, item.id), eq(networkOpportunityInvites.status, "Pendente")));
    await recordAuditEvent(db, {
      actorId: null,
      partnerId: item.partnerId,
      territoryId: item.territoryId,
      resourceType: "network-opportunity",
      resourceId: item.id,
      action: "opportunity_invite_expired",
      previousState: { status: "Aberta" },
      nextState: { status: "Expirada" },
      detail: "Prazo de aceite encerrado.",
    });
    for (const invite of pending) {
      await createNetworkNotification(db, {
        actorId: null,
        recipientUserId: invite.userId,
        type: "opportunity_invite_expiring",
        referenceType: "network-opportunity",
        referenceId: item.id,
        partnerId: item.partnerId,
        territoryId: item.territoryId,
      });
    }
  }
  return expired.map(item => item.id);
}

export async function listOpportunitiesForAdmin(db: Db, actor: Actor) {
  requireOpportunityAdmin(actor.role);
  return withOptionalOpportunitySchema(async () => {
    await expireOpenOpportunities(db);
    const rows = await db.select().from(networkOpportunities).orderBy(desc(networkOpportunities.createdAt));
    const scoped = [];
    for (const row of rows) {
      if (actor.role === "administrador principal") {
        scoped.push(row);
        continue;
      }
      if (!row.partnerId) continue;
      try {
        await assertPartnerScope({ db, actor, partnerId: row.partnerId, territoryIds: [row.territoryId], resourceLabel: "esta oportunidade", requirePartner: true });
        scoped.push(row);
      } catch {
        /* fora do território autorizado */
      }
    }
    const ids = scoped.map(item => item.id);
    const specialties = ids.length ? await db.select().from(networkOpportunitySpecialties).where(inArray(networkOpportunitySpecialties.opportunityId, ids)) : [];
    const invites = ids.length ? await db.select().from(networkOpportunityInvites).where(inArray(networkOpportunityInvites.opportunityId, ids)) : [];
    return scoped.map(item => ({
      ...item,
      specialtyIds: specialties.filter(row => row.opportunityId === item.id).map(row => row.specialtyId),
      invites: invites.filter(row => row.opportunityId === item.id),
      specialties: decodeSpecialties(specialties.filter(row => row.opportunityId === item.id).map(row => row.specialtyId).join(" · ")),
    }));
  }, []);
}

export async function myOpportunityInvites(db: Db, actor: Actor) {
  return withOptionalOpportunitySchema(async () => {
    const profile = await professionalProfileForUser(db, actor.id);
    if (!profile) return { profile: null, buckets: { disponiveis: [], aceitas: [], recusadas: [], expiradas: [] } };
    await expireOpenOpportunities(db);
    const invites = await db.select().from(networkOpportunityInvites).where(eq(networkOpportunityInvites.professionalProfileId, profile.id)).orderBy(desc(networkOpportunityInvites.invitedAt));
    const opportunityIds = invites.map(item => item.opportunityId);
    const opportunities = opportunityIds.length ? await db.select().from(networkOpportunities).where(inArray(networkOpportunities.id, opportunityIds)) : [];
    const specialties = opportunityIds.length ? await db.select().from(networkOpportunitySpecialties).where(inArray(networkOpportunitySpecialties.opportunityId, opportunityIds)) : [];
    const buckets: Record<"disponiveis" | "aceitas" | "recusadas" | "expiradas", Array<{
      invite: { id: number; status: string; invitedAt: Date; expiresAt: Date | null; respondedAt: Date | null };
      opportunity: ReturnType<typeof publicOpportunityView>;
    }>> = { disponiveis: [], aceitas: [], recusadas: [], expiradas: [] };
    for (const invite of invites) {
      const opportunity = opportunities.find(item => item.id === invite.opportunityId);
      if (!opportunity) continue;
      const specialtyIds = specialties.filter(item => item.opportunityId === opportunity.id).map(item => item.specialtyId);
      const bucket = professionalMineBucket(invite.status, derivedOpportunityStatus(opportunity), new Date(), invite.expiresAt);
      buckets[bucket].push({
        invite: {
          id: invite.id,
          status: invite.status,
          invitedAt: invite.invitedAt,
          expiresAt: invite.expiresAt,
          respondedAt: invite.respondedAt,
        },
        opportunity: publicOpportunityView(opportunity, specialtyIds),
      });
    }
    return { profile: { id: profile.id, displayName: profile.displayName }, buckets };
  }, { profile: null, buckets: { disponiveis: [], aceitas: [], recusadas: [], expiradas: [] } });
}

export async function matchProfessionalsForOpportunity(db: Db, actor: Actor, opportunityId: number) {
  requireOpportunityAdmin(actor.role);
  const bundle = await loadOpportunityBundle(db, opportunityId);
  try {
    await assertPartnerScope({ db, actor, partnerId: bundle.opportunity.partnerId, territoryIds: [bundle.opportunity.territoryId], resourceLabel: "esta oportunidade", requirePartner: actor.role !== "administrador principal" && Boolean(bundle.opportunity.partnerId) });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do escopo territorial." });
  }
  const profiles = await db.select().from(professionalProfiles);
  const specialtyRows = await db.select().from(professionalProfileSpecialties);
  const eligible: Array<{ id: number; displayName: string; email: string; specialties: ReturnType<typeof decodeSpecialties>; networkBond: string }> = [];
  const ineligible: Array<{ id: number; displayName: string; reasons: string[] }> = [];
  for (const profile of profiles) {
    if (actor.role !== "administrador principal") {
      const inScope = profile.territoryId === bundle.opportunity.territoryId || (profile.partnerId && profile.partnerId === bundle.opportunity.partnerId);
      if (!inScope) continue;
    }
    const specialtyIds = specialtyRows.filter(item => item.profileId === profile.id).map(item => item.specialtyId);
    const authorizedTerritoryIds = await authorizedTerritoryIdsForProfile(db, profile);
    const match = matchProfessionalForOpportunity({
      profileStatus: profile.status,
      networkBond: profile.networkBond,
      specialtyIds,
      authorizedTerritoryIds,
      opportunityTerritoryId: bundle.opportunity.territoryId,
      requiredSpecialtyIds: bundle.specialtyIds,
    });
    if (match.eligible) {
      eligible.push({
        id: profile.id,
        displayName: profile.displayName,
        email: profile.email,
        specialties: decodeSpecialties(specialtyIds.join(" · ")),
        networkBond: profile.networkBond,
      });
    } else {
      ineligible.push({ id: profile.id, displayName: profile.displayName, reasons: match.reasons });
    }
  }
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: bundle.opportunity.partnerId,
    territoryId: bundle.opportunity.territoryId,
    resourceType: "network-opportunity",
    resourceId: opportunityId,
    action: "matching_executed",
    nextState: { eligibleCount: eligible.length, ineligibleCount: ineligible.length },
    detail: "Matching determinístico por especialidade, território, vínculo e status. Sem score, ranking ou marketplace.",
  });
  return { eligible, ineligible };
}

export async function eligibleProfessionals(db: Db, actor: Actor, opportunityId: number) {
  const match = await matchProfessionalsForOpportunity(db, actor, opportunityId);
  return match.eligible;
}

