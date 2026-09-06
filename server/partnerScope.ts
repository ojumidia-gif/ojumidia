import { and, eq, inArray } from "drizzle-orm";
import { auditEvents, partnerMembers, partners, partnerTerritories, taxonomies } from "../drizzle/schema";
import { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type PartnerActor = { id: number; role: string };

export function isPartnerPrincipal(actor: PartnerActor) {
  return actor.role === "administrador principal";
}

/** Conteúdo sem Parceiro Ojú é operação nacional/central. Admin de parceiro não o lê nem altera. */
export function canAccessCentralPublication(isPrincipal: boolean, hasActivePartnerMembership: boolean, publicationPartnerId: number | null) {
  if (isPrincipal) return true;
  if (publicationPartnerId) return true;
  return !hasActivePartnerMembership;
}

export async function activePartnerMemberships(db: Db, userId: number) {
  return db
    .select({
      membershipId: partnerMembers.id,
      partnerId: partners.id,
      partnerName: partners.displayName,
      partnerSlug: partners.slug,
      partnerStatus: partners.status,
      publicVisibility: partners.publicVisibility,
      instagramHandle: partners.instagramHandle,
      operationalRole: partnerMembers.operationalRole,
      territoryId: partnerMembers.territoryId,
    })
    .from(partnerMembers)
    .innerJoin(partners, eq(partnerMembers.partnerId, partners.id))
    .where(and(eq(partnerMembers.userId, userId), eq(partnerMembers.status, "Ativo"), eq(partners.status, "Ativo")));
}

export function authorizedTerritoryIdsForMembership(membershipTerritoryId: number | null | undefined, partnerTerritoryIds: number[]) {
  if (membershipTerritoryId) {
    return partnerTerritoryIds.includes(membershipTerritoryId) ? [membershipTerritoryId] : [];
  }
  return partnerTerritoryIds;
}

export async function syncPartnerMemberFromGrant(db: Db, input: {
  userId: number;
  partnerId: number;
  territoryId: number;
  createdBy: number;
}) {
  await assertTerritoryTaxonomies(db, [input.territoryId]);
  const partnerTerritories = await partnerTerritoryIds(db, input.partnerId);
  if (!partnerTerritories.includes(input.territoryId)) {
    throw new Error("O território do convite precisa estar ativo neste Parceiro Ojú.");
  }
  const existing = (await db.select().from(partnerMembers).where(and(eq(partnerMembers.partnerId, input.partnerId), eq(partnerMembers.userId, input.userId))).limit(1))[0];
  const values = { operationalRole: "Operador territorial" as const, status: "Ativo" as const, territoryId: input.territoryId, activatedAt: new Date(), revokedAt: null };
  if (existing) await db.update(partnerMembers).set(values).where(eq(partnerMembers.id, existing.id));
  else await db.insert(partnerMembers).values({ partnerId: input.partnerId, userId: input.userId, createdBy: input.createdBy, ...values });
}

export async function partnerTerritoryIds(db: Db, partnerId: number) {
  const rows = await db.select({ territoryId: partnerTerritories.territoryId }).from(partnerTerritories).where(and(eq(partnerTerritories.partnerId, partnerId), eq(partnerTerritories.status, "Ativa")));
  return rows.map(row => row.territoryId);
}

export type AuthenticatedScope = {
  partnerId: number | null;
  territoryId: number | null;
  scope: "global" | "partner" | "central-legacy";
};

export function decideAuthenticatedScope(input: {
  isPrincipal: boolean;
  membershipPartnerIds: number[];
  authorizedTerritoryIds: number[];
  requestedPartnerId: number | null;
  requestedTerritoryId: number | null;
  resourceLabel: string;
}): AuthenticatedScope {
  const { isPrincipal, membershipPartnerIds, authorizedTerritoryIds, requestedPartnerId, requestedTerritoryId, resourceLabel } = input;
  if (isPrincipal) {
    return { partnerId: requestedPartnerId, territoryId: requestedTerritoryId, scope: "global" };
  }
  if (!membershipPartnerIds.length) {
    if (requestedPartnerId) throw new Error(`Você não possui escopo ativo no Parceiro Ojú responsável por ${resourceLabel}.`);
    return { partnerId: null, territoryId: null, scope: "central-legacy" };
  }
  const partnerId =
    requestedPartnerId && membershipPartnerIds.includes(requestedPartnerId)
      ? requestedPartnerId
      : membershipPartnerIds.length === 1
        ? membershipPartnerIds[0]
        : null;
  if (!partnerId) throw new Error(`Selecione um Parceiro Ojú ativo antes de operar ${resourceLabel}.`);
  if (requestedPartnerId && requestedPartnerId !== partnerId) {
    throw new Error(`Você não possui escopo ativo no Parceiro Ojú responsável por ${resourceLabel}.`);
  }
  const territoryId =
    requestedTerritoryId && authorizedTerritoryIds.includes(requestedTerritoryId)
      ? requestedTerritoryId
      : authorizedTerritoryIds.length === 1
        ? authorizedTerritoryIds[0]
        : null;
  if (!territoryId) throw new Error(`Informe ao menos um território autorizado para ${resourceLabel}.`);
  if (requestedTerritoryId && !authorizedTerritoryIds.includes(requestedTerritoryId)) {
    throw new Error("O território informado não pertence ao escopo autorizado deste Parceiro Ojú.");
  }
  return { partnerId, territoryId, scope: "partner" };
}

export async function resolveAuthenticatedScope(input: {
  db: Db;
  actor: PartnerActor;
  requestedPartnerId?: number | null;
  requestedTerritoryId?: number | null;
  resourceLabel: string;
}): Promise<AuthenticatedScope> {
  const requestedPartnerId = input.requestedPartnerId ?? null;
  const requestedTerritoryId = input.requestedTerritoryId ?? null;
  if (isPartnerPrincipal(input.actor)) {
    return decideAuthenticatedScope({
      isPrincipal: true,
      membershipPartnerIds: [],
      authorizedTerritoryIds: [],
      requestedPartnerId,
      requestedTerritoryId,
      resourceLabel: input.resourceLabel,
    });
  }
  const memberships = await activePartnerMemberships(input.db, input.actor.id);
  const membershipPartnerIds = memberships.map(item => item.partnerId);
  const partnerIdForTerritories =
    requestedPartnerId && membershipPartnerIds.includes(requestedPartnerId)
      ? requestedPartnerId
      : membershipPartnerIds.length === 1
        ? membershipPartnerIds[0]
        : null;
  const partnerTerritoriesList = partnerIdForTerritories ? await partnerTerritoryIds(input.db, partnerIdForTerritories) : [];
  const membership = memberships.find(item => item.partnerId === partnerIdForTerritories);
  const authorizedTerritoryIds = authorizedTerritoryIdsForMembership(membership?.territoryId, partnerTerritoriesList);
  return decideAuthenticatedScope({
    isPrincipal: false,
    membershipPartnerIds,
    authorizedTerritoryIds,
    requestedPartnerId,
    requestedTerritoryId,
    resourceLabel: input.resourceLabel,
  });
}

export async function assertPartnerScope(input: {
  db: Db;
  actor: PartnerActor;
  partnerId: number | null | undefined;
  territoryIds?: Array<number | null | undefined>;
  resourceLabel: string;
  requirePartner?: boolean;
}) {
  const { db, actor, partnerId, territoryIds = [], resourceLabel, requirePartner = false } = input;
  if (isPartnerPrincipal(actor)) return { partnerId: partnerId ?? null, territoryIds: territoryIds.filter((id): id is number => Boolean(id)), scope: "global" as const };
  if (!partnerId) {
    if (requirePartner) throw new Error(`Selecione um Parceiro Ojú ativo antes de operar ${resourceLabel}.`);
    return { partnerId: null, territoryIds: [], scope: "central-legacy" as const };
  }
  const memberships = await activePartnerMemberships(db, actor.id);
  const membership = memberships.find(item => item.partnerId === partnerId);
  if (!membership) throw new Error(`Você não possui escopo ativo no Parceiro Ojú responsável por ${resourceLabel}.`);
  const partnerTerritoriesList = await partnerTerritoryIds(db, partnerId);
  const authorizedTerritories = authorizedTerritoryIdsForMembership(membership.territoryId, partnerTerritoriesList);
  const effectiveTerritories = territoryIds.filter((id): id is number => Boolean(id));
  if (!effectiveTerritories.length) throw new Error(`Informe ao menos um território autorizado para ${resourceLabel}.`);
  if (!authorizedTerritories.length || effectiveTerritories.some(id => !authorizedTerritories.includes(id))) throw new Error(`O território informado não pertence ao escopo autorizado deste Parceiro Ojú.`);
  return { partnerId, territoryIds: effectiveTerritories, scope: "partner" as const, membership };
}

export async function assertTerritoryTaxonomies(db: Db, territoryIds: number[]) {
  const uniqueIds = Array.from(new Set(territoryIds));
  if (!uniqueIds.length) return [];
  const rows = await db.select({ id: taxonomies.id }).from(taxonomies).where(and(inArray(taxonomies.id, uniqueIds), eq(taxonomies.dimension, "Território")));
  if (rows.length !== uniqueIds.length) throw new Error("Selecione somente taxonomias da dimensão Território.");
  return uniqueIds;
}

export async function recordAuditEvent(db: Db, input: {
  actorId?: number | null;
  partnerId?: number | null;
  territoryId?: number | null;
  resourceType: string;
  resourceId?: number | null;
  action: string;
  previousState?: unknown;
  nextState?: unknown;
  detail?: string | null;
}) {
  await db.insert(auditEvents).values({
    actorId: input.actorId ?? null,
    partnerId: input.partnerId ?? null,
    territoryId: input.territoryId ?? null,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    action: input.action,
    previousState: input.previousState === undefined ? null : JSON.stringify(input.previousState),
    nextState: input.nextState === undefined ? null : JSON.stringify(input.nextState),
    detail: input.detail ?? null,
  });
}
