import { and, eq, inArray } from "drizzle-orm";
import { auditEvents, partnerMembers, partners, partnerTerritories, taxonomies } from "../drizzle/schema";
import { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type PartnerActor = { id: number; role: string };

export function isPartnerPrincipal(actor: PartnerActor) {
  return actor.role === "administrador principal";
}

export async function activePartnerMemberships(db: Db, userId: number) {
  return db
    .select({
      membershipId: partnerMembers.id,
      partnerId: partners.id,
      partnerName: partners.displayName,
      partnerSlug: partners.slug,
      partnerStatus: partners.status,
      operationalRole: partnerMembers.operationalRole,
    })
    .from(partnerMembers)
    .innerJoin(partners, eq(partnerMembers.partnerId, partners.id))
    .where(and(eq(partnerMembers.userId, userId), eq(partnerMembers.status, "Ativo"), eq(partners.status, "Ativo")));
}

export async function partnerTerritoryIds(db: Db, partnerId: number) {
  const rows = await db.select({ territoryId: partnerTerritories.territoryId }).from(partnerTerritories).where(and(eq(partnerTerritories.partnerId, partnerId), eq(partnerTerritories.status, "Ativa")));
  return rows.map(row => row.territoryId);
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
  const authorizedTerritories = await partnerTerritoryIds(db, partnerId);
  const effectiveTerritories = territoryIds.filter((id): id is number => Boolean(id));
  if (!effectiveTerritories.length) throw new Error(`Informe ao menos um território autorizado para ${resourceLabel}.`);
  if (effectiveTerritories.some(id => !authorizedTerritories.includes(id))) throw new Error(`O território informado não pertence ao escopo autorizado deste Parceiro Ojú.`);
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
