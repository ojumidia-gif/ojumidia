import { TRPCError } from "@trpc/server";
import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  institutions,
  mediaAssets,
  networkProductions,
  networkVoices,
  professionalProfiles,
  publicationMedia,
  publications,
  taxonomies,
} from "../../drizzle/schema";
import {
  auditActionForVoiceStaffAction,
  canManageNetworkVoices,
  canSetNationalVoiceCuration,
  canTransitionNetworkVoice,
  compareNetworkVoicesForPublicPresentation,
  isNetworkVoiceNationallyCurated,
  isNetworkVoicePubliclyVisible,
  networkVoiceCurationScopes,
  networkVoiceNameVisibilities,
  networkVoiceRelations,
  networkVoiceStaffActions,
  nextNetworkVoiceStatus,
  publicSpeakerLabel,
  type NetworkVoiceCurationScope,
  type NetworkVoiceStaffAction,
} from "@shared/networkVoices";
import { getDb } from "../db";
import { assertPartnerScope, recordAuditEvent } from "../partnerScope";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

function requireStaff(role: string) {
  if (!canManageNetworkVoices(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso editorial não autorizado." });
}

function isPrincipal(role: string) {
  return role === "administrador principal";
}

async function requireVoiceScope(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  actor: { id: number; role: string },
  partnerId: number | null | undefined,
  territoryId: number | null | undefined,
) {
  if (isPrincipal(actor.role)) return;
  if (!partnerId || !territoryId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Depoimentos sem território autorizado ficam na curadoria nacional." });
  }
  try {
    await assertPartnerScope({ db, actor, partnerId, territoryIds: [territoryId], resourceLabel: "este depoimento", requirePartner: true });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do escopo territorial." });
  }
}

const submitInput = z.object({
  body: z.string().trim().min(40).max(4000),
  speakerName: z.string().trim().min(2).max(240).optional(),
  speakerNameVisibility: z.enum(networkVoiceNameVisibilities),
  relationKind: z.enum(networkVoiceRelations),
  contextNote: z.string().trim().max(420).optional(),
  authorEmail: z.string().trim().email().max(320),
  publicationId: z.number().int().positive().optional(),
  productionId: z.number().int().positive().optional(),
  professionalProfileId: z.number().int().positive().optional(),
  institutionId: z.number().int().positive().optional(),
  partnerId: z.number().int().positive().optional(),
  territoryId: z.number().int().positive().optional(),
  consentToEditorialReview: z.literal(true),
});

function requestMeta(ctx: { req: { ip?: string; headers: Record<string, unknown> } }) {
  const forwarded = ctx.req.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const agent = ctx.req.headers["user-agent"];
  const agentValue = Array.isArray(agent) ? agent[0] : agent;
  return {
    requestIp: (typeof forwardedValue === "string" ? forwardedValue : ctx.req.ip || "").toString().trim().slice(0, 64) || null,
    userAgent: (typeof agentValue === "string" ? agentValue : "").slice(0, 320) || null,
  };
}

async function loadPublicContext(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, rows: Array<typeof networkVoices.$inferSelect>) {
  const publicationIds = Array.from(new Set(rows.map(row => row.publicationId).filter((id): id is number => Boolean(id))));
  const productionIds = Array.from(new Set(rows.map(row => row.productionId).filter((id): id is number => Boolean(id))));
  const profileIds = Array.from(new Set(rows.map(row => row.professionalProfileId).filter((id): id is number => Boolean(id))));
  const institutionIds = Array.from(new Set(rows.map(row => row.institutionId).filter((id): id is number => Boolean(id))));
  const territoryIds = Array.from(new Set(rows.map(row => row.territoryId).filter((id): id is number => Boolean(id))));

  const [storyRows, productions, profiles, houses, territories, covers] = await Promise.all([
    publicationIds.length ? db.select({ id: publications.id, title: publications.title, slug: publications.slug, status: publications.status, isPublic: publications.isPublic }).from(publications).where(inArray(publications.id, publicationIds)) : Promise.resolve([]),
    productionIds.length ? db.select({ id: networkProductions.id, title: networkProductions.title }).from(networkProductions).where(inArray(networkProductions.id, productionIds)) : Promise.resolve([]),
    profileIds.length ? db.select({ id: professionalProfiles.id, displayName: professionalProfiles.displayName, publicSlug: professionalProfiles.publicSlug, publicVisible: professionalProfiles.publicVisible }).from(professionalProfiles).where(inArray(professionalProfiles.id, profileIds)) : Promise.resolve([]),
    institutionIds.length ? db.select({ id: institutions.id, name: institutions.name, slug: institutions.slug }).from(institutions).where(inArray(institutions.id, institutionIds)) : Promise.resolve([]),
    territoryIds.length ? db.select({ id: taxonomies.id, name: taxonomies.name }).from(taxonomies).where(inArray(taxonomies.id, territoryIds)) : Promise.resolve([]),
    publicationIds.length ? db.select({ publicationId: publicationMedia.publicationId, credit: mediaAssets.credit }).from(publicationMedia).innerJoin(mediaAssets, eq(publicationMedia.mediaId, mediaAssets.id)).where(inArray(publicationMedia.publicationId, publicationIds)) : Promise.resolve([]),
  ]);

  const stories = new Map(storyRows.map(item => [item.id, item]));
  const productionById = new Map(productions.map(item => [item.id, item]));
  const profileById = new Map(profiles.map(item => [item.id, item]));
  const houseById = new Map(houses.map(item => [item.id, item]));
  const territoryById = new Map(territories.map(item => [item.id, item]));
  const creditByPublication = new Map<number, string>();
  for (const cover of covers) {
    if (cover.credit && !creditByPublication.has(cover.publicationId)) creditByPublication.set(cover.publicationId, cover.credit);
  }

  return rows.map(row => {
    const story = row.publicationId ? stories.get(row.publicationId) : null;
    const storyPublic = Boolean(story && story.status === "Publicada" && story.isPublic);
    const profile = row.professionalProfileId ? profileById.get(row.professionalProfileId) : null;
    const house = row.institutionId ? houseById.get(row.institutionId) : null;
    return {
      id: row.id,
      body: row.body,
      speakerPublicName: publicSpeakerLabel(row),
      relationKind: row.relationKind,
      contextNote: row.contextNote,
      curationScope: row.curationScope,
      nationallyCurated: isNetworkVoiceNationallyCurated(row),
      story: storyPublic && story ? { title: story.title, href: `/historias/${story.slug}` } : null,
      photographyCredit: row.publicationId ? creditByPublication.get(row.publicationId) ?? null : null,
      productionTitle: row.productionId ? productionById.get(row.productionId)?.title ?? null : null,
      professionalName: profile?.publicVisible ? profile.displayName : null,
      houseName: house?.name ?? null,
      territoryName: row.territoryId ? territoryById.get(row.territoryId)?.name ?? null : null,
    };
  });
}

export const networkVoicesRouter = router({
  publicPublished: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(networkVoices).where(eq(networkVoices.status, "Publicado"));
    const visible = rows.filter(row => isNetworkVoicePubliclyVisible(row.status)).sort(compareNetworkVoicesForPublicPresentation);
    const payload = await loadPublicContext(db, visible);
    return {
      curated: payload.filter(item => item.nationallyCurated),
      published: payload.filter(item => !item.nationallyCurated),
    };
  }),

  submit: publicProcedure.input(submitInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { consentToEditorialReview: _consent, ...values } = input;
    const result = await db.insert(networkVoices).values({
      body: values.body,
      speakerName: values.speakerName ?? null,
      speakerNameVisibility: values.speakerNameVisibility,
      relationKind: values.relationKind,
      contextNote: values.contextNote ?? null,
      authorEmail: values.authorEmail,
      publicationId: values.publicationId ?? null,
      productionId: values.productionId ?? null,
      professionalProfileId: values.professionalProfileId ?? null,
      institutionId: values.institutionId ?? null,
      partnerId: values.partnerId ?? null,
      territoryId: values.territoryId ?? null,
      status: "Aguardando análise",
      curationScope: "Nenhum",
      createdBy: ctx.user?.id ?? null,
    });
    const id = Number(result[0].insertId);
    await recordAuditEvent(db, {
      actorId: ctx.user?.id ?? null,
      partnerId: values.partnerId ?? null,
      territoryId: values.territoryId ?? null,
      resourceType: "network-voice",
      resourceId: id,
      action: "voice-submit",
      nextState: { status: "Aguardando análise" },
      ...requestMeta(ctx),
    });
    return { id };
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    requireStaff(ctx.user.role);
    const db = await requireDb();
    const rows = await db.select().from(networkVoices).orderBy(asc(networkVoices.status), asc(networkVoices.curationDisplayOrder), asc(networkVoices.speakerName));
    if (isPrincipal(ctx.user.role)) return rows;
    const scoped = await Promise.all(rows.map(async row => {
      try {
        await requireVoiceScope(db, ctx.user, row.partnerId, row.territoryId);
        return row;
      } catch {
        return null;
      }
    }));
    return scoped.filter((row): row is typeof rows[number] => Boolean(row));
  }),

  decide: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    action: z.enum(networkVoiceStaffActions),
    note: z.string().trim().max(2000).optional(),
  })).mutation(async ({ ctx, input }) => {
    requireStaff(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(networkVoices).where(eq(networkVoices.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Depoimento não encontrado." });
    await requireVoiceScope(db, ctx.user, current.partnerId, current.territoryId);
    if (!canTransitionNetworkVoice(current.status, input.action as NetworkVoiceStaffAction)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Esta etapa editorial não admite essa ação." });
    }
    const status = nextNetworkVoiceStatus(current.status, input.action as NetworkVoiceStaffAction);
    const publishedAt = status === "Publicado" ? new Date() : current.publishedAt;
    const unpublishedAt = status === "Retirado" ? new Date() : current.unpublishedAt;
    const curationScope = status === "Publicado" ? current.curationScope : "Nenhum";
    await db.update(networkVoices).set({
      status,
      publishedAt,
      unpublishedAt,
      curationScope,
      adjustmentNote: input.action === "requestAdjustment" ? (input.note || current.adjustmentNote) : current.adjustmentNote,
      reviewedBy: ctx.user.id,
      reviewedAt: new Date(),
      managedByUserId: current.managedByUserId ?? ctx.user.id,
    }).where(eq(networkVoices.id, current.id));
    await recordAuditEvent(db, {
      actorId: ctx.user.id,
      partnerId: current.partnerId,
      territoryId: current.territoryId,
      resourceType: "network-voice",
      resourceId: current.id,
      action: auditActionForVoiceStaffAction(input.action as NetworkVoiceStaffAction),
      previousState: { status: current.status, curationScope: current.curationScope },
      nextState: { status, curationScope },
      detail: input.note || null,
      ...requestMeta(ctx),
    });
    return { success: true, status };
  }),

  setCuration: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    curationScope: z.enum(networkVoiceCurationScopes),
    curationDisplayOrder: z.number().int().min(0).max(99).optional(),
  })).mutation(async ({ ctx, input }) => {
    requireStaff(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(networkVoices).where(eq(networkVoices.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Depoimento não encontrado." });
    await requireVoiceScope(db, ctx.user, current.partnerId, current.territoryId);
    if (current.status !== "Publicado") throw new TRPCError({ code: "BAD_REQUEST", message: "A curadoria só se aplica a depoimento publicado." });
    if (input.curationScope === "Nacional" && !canSetNationalVoiceCuration(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "A curadoria nacional é exclusiva do Super Admin." });
    }
    await db.update(networkVoices).set({
      curationScope: input.curationScope as NetworkVoiceCurationScope,
      curationDisplayOrder: input.curationDisplayOrder ?? current.curationDisplayOrder,
    }).where(eq(networkVoices.id, current.id));
    await recordAuditEvent(db, {
      actorId: ctx.user.id,
      partnerId: current.partnerId,
      territoryId: current.territoryId,
      resourceType: "network-voice",
      resourceId: current.id,
      action: input.curationScope === "Nenhum" ? "voice-uncurate" : "voice-curate",
      previousState: { curationScope: current.curationScope },
      nextState: { curationScope: input.curationScope },
      ...requestMeta(ctx),
    });
    return { success: true };
  }),

  linkContext: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    publicationId: z.number().int().positive().nullable().optional(),
    productionId: z.number().int().positive().nullable().optional(),
    professionalProfileId: z.number().int().positive().nullable().optional(),
    institutionId: z.number().int().positive().nullable().optional(),
    partnerId: z.number().int().positive().nullable().optional(),
    territoryId: z.number().int().positive().nullable().optional(),
    contextNote: z.string().trim().max(420).nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    requireStaff(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(networkVoices).where(eq(networkVoices.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Depoimento não encontrado." });
    await requireVoiceScope(db, ctx.user, current.partnerId, current.territoryId);
    const partnerId = input.partnerId === undefined ? current.partnerId : input.partnerId;
    const territoryId = input.territoryId === undefined ? current.territoryId : input.territoryId;
    await requireVoiceScope(db, ctx.user, partnerId, territoryId);
    if (input.partnerId !== undefined && input.partnerId !== current.partnerId && !isPrincipal(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Super Admin pode alterar o parceiro responsável." });
    }
    await db.update(networkVoices).set({
      publicationId: input.publicationId === undefined ? current.publicationId : input.publicationId,
      productionId: input.productionId === undefined ? current.productionId : input.productionId,
      professionalProfileId: input.professionalProfileId === undefined ? current.professionalProfileId : input.professionalProfileId,
      institutionId: input.institutionId === undefined ? current.institutionId : input.institutionId,
      partnerId,
      territoryId,
      contextNote: input.contextNote === undefined ? current.contextNote : input.contextNote,
    }).where(eq(networkVoices.id, current.id));
    await recordAuditEvent(db, {
      actorId: ctx.user.id,
      partnerId,
      territoryId,
      resourceType: "network-voice",
      resourceId: current.id,
      action: "voice-link-context",
      previousState: { publicationId: current.publicationId, productionId: current.productionId, partnerId: current.partnerId, territoryId: current.territoryId },
      nextState: { publicationId: input.publicationId ?? current.publicationId, productionId: input.productionId ?? current.productionId, partnerId, territoryId },
      ...requestMeta(ctx),
    });
    return { success: true };
  }),
});
