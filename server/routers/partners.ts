import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { mediaAssets, partnerMembers, partners, partnerTerritories, taxonomies, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { activePartnerMemberships, assertTerritoryTaxonomies, recordAuditEvent } from "../partnerScope";

const partnerStatuses = ["Rascunho", "Em revisão", "Ativo", "Suspenso", "Desativado"] as const;
const memberRoles = ["Gestor territorial", "Operador territorial", "Curador territorial"] as const;
const memberStatuses = ["Convidado", "Ativo", "Suspenso", "Revogado"] as const;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

function requirePrincipal(role: string) {
  if (role !== "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Super Admin pode administrar Parceiros Ojú." });
}

async function assertPartnerMedia(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, mediaId: number | null | undefined) {
  if (!mediaId) return;
  const media = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1))[0];
  if (!media || media.state !== "Ativo" || media.deletedAt || !media.publicationAllowed) throw new TRPCError({ code: "BAD_REQUEST", message: "A identidade do parceiro exige mídia ativa, autorizada e fora da lixeira." });
}

const partnerInput = z.object({
  displayName: z.string().trim().min(2).max(240),
  slug: z.string().trim().min(2).max(260).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use slug em minúsculas, números e hífens."),
  description: z.string().max(8000).nullable().optional(),
  contactText: z.string().max(320).nullable().optional(),
  logoMediaId: z.number().int().positive().nullable().optional(),
  profileMediaId: z.number().int().positive().nullable().optional(),
  publicVisibility: z.boolean().optional(),
  status: z.enum(partnerStatuses).optional(),
});

export const partnersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const [partnerRows, territoryRows, memberRows] = await Promise.all([
      db.select().from(partners).orderBy(desc(partners.updatedAt)),
      db.select({ partnerId: partnerTerritories.partnerId, territoryId: taxonomies.id, territoryName: taxonomies.name }).from(partnerTerritories).innerJoin(taxonomies, eq(partnerTerritories.territoryId, taxonomies.id)).where(eq(partnerTerritories.status, "Ativa")).orderBy(asc(taxonomies.name)),
      db.select({ partnerId: partnerMembers.partnerId, userId: users.id, name: users.name, email: users.email, operationalRole: partnerMembers.operationalRole, status: partnerMembers.status }).from(partnerMembers).innerJoin(users, eq(partnerMembers.userId, users.id)).orderBy(asc(users.name)),
    ]);
    return partnerRows.map(partner => ({
      ...partner,
      territories: territoryRows.filter(item => item.partnerId === partner.id).map(({ territoryId, territoryName }) => ({ id: territoryId, name: territoryName })),
      members: memberRows.filter(item => item.partnerId === partner.id).map(({ userId, name, email, operationalRole, status }) => ({ userId, name, email, operationalRole, status })),
    }));
  }),
  myContext: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    if (ctx.user.role === "administrador principal") return { scope: "global" as const, partners: [] };
    const memberships = await activePartnerMemberships(db, ctx.user.id);
    const partnerIds = memberships.map(item => item.partnerId);
    const territoryRows = partnerIds.length
      ? await db.select({ partnerId: partnerTerritories.partnerId, id: taxonomies.id, name: taxonomies.name }).from(partnerTerritories).innerJoin(taxonomies, eq(partnerTerritories.territoryId, taxonomies.id)).where(and(inArray(partnerTerritories.partnerId, partnerIds), eq(partnerTerritories.status, "Ativa"))).orderBy(asc(taxonomies.name))
      : [];
    return {
      scope: memberships.length ? "partner" as const : "central-legacy" as const,
      partners: memberships.map(membership => ({ ...membership, territories: territoryRows.filter(item => item.partnerId === membership.partnerId).map(({ id, name }) => ({ id, name })) })),
    };
  }),
  create: protectedProcedure.input(partnerInput).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    await Promise.all([assertPartnerMedia(db, input.logoMediaId), assertPartnerMedia(db, input.profileMediaId)]);
    const result = await db.insert(partners).values({ ...input, description: input.description?.trim() || null, contactText: input.contactText?.trim() || null, status: input.status ?? "Rascunho", publicVisibility: input.publicVisibility ?? false, createdBy: ctx.user.id });
    const id = Number(result[0].insertId);
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: id, resourceType: "partner", resourceId: id, action: "partner-created", nextState: { status: input.status ?? "Rascunho", publicVisibility: input.publicVisibility ?? false }, detail: "Parceiro Ojú criado em estado controlado." });
    return { id };
  }),
  update: protectedProcedure.input(partnerInput.partial().extend({ id: z.number().int().positive(), expectedVersion: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(partners).where(eq(partners.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Parceiro Ojú não encontrado." });
    if (current.version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Este parceiro foi atualizado por outra pessoa. Reabra o registro antes de salvar." });
    await Promise.all([assertPartnerMedia(db, input.logoMediaId), assertPartnerMedia(db, input.profileMediaId)]);
    const nextStatus = input.status ?? current.status;
    if (nextStatus === "Ativo") {
      const territoryCount = (await db.select({ id: partnerTerritories.id }).from(partnerTerritories).where(eq(partnerTerritories.partnerId, current.id))).length;
      if (!territoryCount) throw new TRPCError({ code: "BAD_REQUEST", message: "Defina ao menos um território antes de ativar o Parceiro Ojú." });
    }
    const { id, expectedVersion, ...values } = input;
    const update = await db.update(partners).set({ ...values, description: values.description === undefined ? undefined : values.description?.trim() || null, contactText: values.contactText === undefined ? undefined : values.contactText?.trim() || null, approvedBy: nextStatus === "Ativo" ? ctx.user.id : current.approvedBy, approvedAt: nextStatus === "Ativo" ? (current.approvedAt ?? new Date()) : current.approvedAt, version: current.version + 1 }).where(and(eq(partners.id, id), eq(partners.version, expectedVersion)));
    if (!update[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Este parceiro foi atualizado por outra pessoa. Reabra o registro antes de salvar." });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: id, resourceType: "partner", resourceId: id, action: "partner-updated", previousState: { status: current.status, version: current.version }, nextState: { status: nextStatus, version: current.version + 1 }, detail: "Identidade ou governança territorial de parceiro atualizada." });
    return { success: true, version: current.version + 1 };
  }),
  setTerritories: protectedProcedure.input(z.object({ partnerId: z.number().int().positive(), territoryIds: z.array(z.number().int().positive()).max(100), expectedVersion: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(partners).where(eq(partners.id, input.partnerId)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Parceiro Ojú não encontrado." });
    if (current.version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Este parceiro foi atualizado por outra pessoa. Reabra o registro antes de salvar." });
    const territoryIds = await assertTerritoryTaxonomies(db, input.territoryIds);
    if (current.status === "Ativo" && !territoryIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Um Parceiro Ojú ativo precisa manter ao menos um território autorizado." });
    const previous = await db.select({ id: partnerTerritories.id, territoryId: partnerTerritories.territoryId, status: partnerTerritories.status, startsAt: partnerTerritories.startsAt, endsAt: partnerTerritories.endsAt }).from(partnerTerritories).where(and(eq(partnerTerritories.partnerId, current.id), eq(partnerTerritories.status, "Ativa")));
    const currentIds = previous.map(item => item.territoryId);
    const toEnd = previous.filter(item => !territoryIds.includes(item.territoryId));
    if (toEnd.length) await Promise.all(toEnd.map(item => db.update(partnerTerritories).set({ status: "Encerrada", activeKey: null, endsAt: new Date() }).where(eq(partnerTerritories.id, item.id))));
    const toAdd = territoryIds.filter(territoryId => !currentIds.includes(territoryId));
    if (toAdd.length) await db.insert(partnerTerritories).values(toAdd.map(territoryId => ({ partnerId: current.id, territoryId, status: "Ativa" as const, activeKey: `${current.id}:${territoryId}`, startsAt: new Date(), createdBy: ctx.user.id })));
    await db.update(partners).set({ version: current.version + 1 }).where(and(eq(partners.id, current.id), eq(partners.version, input.expectedVersion)));
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.id, resourceType: "partner-territories", resourceId: current.id, action: "partner-territory-tenure-updated", previousState: previous, nextState: { activeTerritoryIds: territoryIds, endedTerritoryIds: toEnd.map(item => item.territoryId), startedTerritoryIds: toAdd }, detail: "Titularidade territorial atualizada pelo Super Admin sem apagar associações históricas." });
    return { success: true, version: current.version + 1 };
  }),
  setMember: protectedProcedure.input(z.object({ partnerId: z.number().int().positive(), userId: z.number().int().positive(), operationalRole: z.enum(memberRoles), status: z.enum(memberStatuses) })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const [partner, account] = await Promise.all([
      db.select().from(partners).where(eq(partners.id, input.partnerId)).limit(1),
      db.select({ id: users.id, adminAccess: users.adminAccess, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1),
    ]);
    if (!partner[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Parceiro Ojú não encontrado." });
    if (!account[0] || !account[0].adminAccess) throw new TRPCError({ code: "BAD_REQUEST", message: "O membro precisa possuir acesso administrativo ativo antes de ser associado ao parceiro." });
    const existing = (await db.select().from(partnerMembers).where(and(eq(partnerMembers.partnerId, input.partnerId), eq(partnerMembers.userId, input.userId))).limit(1))[0];
    const values = { operationalRole: input.operationalRole, status: input.status, activatedAt: input.status === "Ativo" ? new Date() : existing?.activatedAt ?? null, revokedAt: ["Suspenso", "Revogado"].includes(input.status) ? new Date() : null };
    if (existing) await db.update(partnerMembers).set(values).where(eq(partnerMembers.id, existing.id));
    else await db.insert(partnerMembers).values({ partnerId: input.partnerId, userId: input.userId, createdBy: ctx.user.id, ...values });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: input.partnerId, resourceType: "partner-member", resourceId: input.userId, action: "partner-member-set", previousState: existing ? { status: existing.status, operationalRole: existing.operationalRole } : null, nextState: input, detail: "Membro associado ou atualizado no Parceiro Ojú." });
    return { success: true };
  }),
});
