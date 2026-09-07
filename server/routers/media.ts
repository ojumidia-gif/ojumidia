import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import { HOME_MINICLIP_CURATION_SETTING, HOME_MINICLIP_DISPLAY_SECONDS, HOME_MINICLIP_MAX_DURATION_SECONDS, HOME_MINICLIP_SEQUENCE_LIMIT, HOME_MINICLIP_TRANSITION_MS } from "@shared/const";
import {
  allowAnonymousCurationSignal,
  encodeBackgroundClipTerms,
  incrementHomeMiniclipCurationSignal,
  parseCaptionTrackUrl,
  parseHomeMiniclipCurationSignals,
} from "@shared/homeMiniclip";
import { commercialMiniclips, mediaAssets, networkExecutors, settings, uploadSessions, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { publishEditorialEvent } from "../editorialEvents";
import {
  cleanupAbandonedUploadSession,
  cleanupExpiredAbandonedUploads,
  collectMediaUsages,
  GENERATED_ARTIFACT_INVENTORY,
  inspectMediaObject,
  listAbandonedUploadSessions,
  listUnlinkedUploadSessions,
  mediaOccupancy,
  purgeMediaAsset,
  restoreMediaIfRecoverable,
} from "../mediaLifecycle";
import { assertPartnerScope, recordAuditEvent, resolveAuthenticatedScope } from "../partnerScope";
import { DEFAULT_STORAGE_QUOTA, quotaDecision } from "../uploadGuards";
import { loadStorageQuotaPolicy, saveStorageQuotaPolicy } from "../uploadBudget";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

function requireAdmin(role: string) {
  if (!["administrador", "administrador principal"].includes(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem executar esta ação." });
}
function requirePrincipal(role: string) {
  if (role !== "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Super Admin pode alterar a transição do fundo vivo." });
}
function requireSuperAdmin(role: string) {
  if (role !== "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Super Admin pode enviar uma mídia para a Lixeira, restaurá-la, expurgá-la ou alterar retenção técnica." });
}

async function scopedMediaWhere(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, user: { id: number; role: string }, trash: boolean) {
  const conditions = [trash ? isNotNull(mediaAssets.deletedAt) : isNull(mediaAssets.deletedAt)];
  if (user.role === "administrador principal") return and(...conditions);
  conditions.push(eq(mediaAssets.createdBy, user.id));
  return and(...conditions);
}

async function resolvePhotographerCredit(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, actor: { id: number; role: string }, photographerId: number | null | undefined, partnerId: number | null, credit: string) {
  if (!photographerId) return { photographerId: null, credit };
  const photographer = (await db.select().from(networkExecutors).where(and(eq(networkExecutors.id, photographerId), eq(networkExecutors.status, "Ativo"))).limit(1))[0];
  if (!photographer) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um fotógrafo ativo da Rede Ojú." });
  if (actor.role !== "administrador principal" && photographer.partnerId && partnerId && photographer.partnerId !== partnerId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "O fotógrafo precisa pertencer ao mesmo Parceiro Ojú da mídia." });
  }
  return { photographerId: photographer.id, credit: photographer.displayName || credit };
}
export const heroTransitionSchema = z.object({
  displaySeconds: z.literal(HOME_MINICLIP_DISPLAY_SECONDS),
  transitionMilliseconds: z.literal(HOME_MINICLIP_TRANSITION_MS),
});
export const defaultHeroTransition = { displaySeconds: HOME_MINICLIP_DISPLAY_SECONDS, transitionMilliseconds: HOME_MINICLIP_TRANSITION_MS } as const;
export function canActivateBackgroundClip(clip: Pick<typeof mediaAssets.$inferSelect, "mediaType" | "publicationAllowed" | "state">) {
  return clip.mediaType === "vídeo" && clip.publicationAllowed && clip.state === "Ativo";
}

async function assertMediaScope(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, actor: { id: number; role: string }, media: typeof mediaAssets.$inferSelect) {
  if (actor.role === "administrador principal") return;
  if (media.createdBy !== actor.id) throw new TRPCError({ code: "FORBIDDEN", message: "Esta mídia pertence a outro admin." });
  if (!media.partnerId) return;
  try {
    await assertPartnerScope({ db, actor, partnerId: media.partnerId, territoryIds: media.territoryId ? [media.territoryId] : [], resourceLabel: "esta mídia", requirePartner: true });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Você não possui escopo para esta mídia." });
  }
}

export const mediaRouter = router({
  homeBackgrounds: publicProcedure.query(async () => {
    const db = await requireDb();
    const commercial = await db.select().from(mediaAssets).innerJoin(commercialMiniclips, eq(mediaAssets.id, commercialMiniclips.mediaId)).where(and(eq(commercialMiniclips.status, "Ativo"), eq(commercialMiniclips.homeFeatured, true), eq(commercialMiniclips.authorizedForHome, true), eq(mediaAssets.mediaType, "vídeo"), eq(mediaAssets.publicationAllowed, true), eq(mediaAssets.state, "Ativo"), isNull(mediaAssets.deletedAt))).orderBy(desc(commercialMiniclips.updatedAt)).limit(1);
    if (commercial[0]) return [commercial[0].mediaAssets];
    return db.select().from(mediaAssets).where(and(eq(mediaAssets.backgroundEligible, true), eq(mediaAssets.publicationAllowed, true), eq(mediaAssets.state, "Ativo"), isNull(mediaAssets.deletedAt))).orderBy(desc(mediaAssets.backgroundPriority), desc(mediaAssets.createdAt)).limit(HOME_MINICLIP_SEQUENCE_LIMIT);
  }),
  homeBackgroundConfig: publicProcedure.query(async () => defaultHeroTransition),
  publicBackgroundClip: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await requireDb();
    const clip = (await db.select().from(mediaAssets).where(and(
      eq(mediaAssets.id, input.id),
      eq(mediaAssets.mediaType, "vídeo"),
      eq(mediaAssets.publicationAllowed, true),
      eq(mediaAssets.state, "Ativo"),
      isNull(mediaAssets.deletedAt),
    )).limit(1))[0];
    if (!clip) throw new TRPCError({ code: "NOT_FOUND", message: "Miniclipe indisponível." });
    const commercial = (await db.select({ id: commercialMiniclips.id }).from(commercialMiniclips).where(and(
      eq(commercialMiniclips.mediaId, clip.id),
      eq(commercialMiniclips.status, "Ativo"),
      eq(commercialMiniclips.homeFeatured, true),
      eq(commercialMiniclips.authorizedForHome, true),
    )).limit(1))[0];
    if (!clip.backgroundEligible && !commercial) throw new TRPCError({ code: "NOT_FOUND", message: "Miniclipe indisponível." });
    return { id: clip.id, assetUrl: clip.assetUrl, credit: clip.credit, origin: clip.origin, filename: clip.filename, durationSeconds: clip.durationSeconds, captionTrackUrl: parseCaptionTrackUrl(clip.terms) };
  }),
  homeMiniclipCuration: protectedProcedure.query(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const stored = (await db.select().from(settings).where(eq(settings.settingKey, HOME_MINICLIP_CURATION_SETTING)).limit(1))[0];
    return parseHomeMiniclipCurationSignals(stored?.settingValue);
  }),
  recordHomeMiniclipSignal: publicProcedure.input(z.object({
    action: z.enum(["watch", "mute", "unmute"]),
    mediaId: z.number().int().positive().optional(),
  })).mutation(async ({ ctx, input }) => {
    const forwarded = ctx.req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" && forwarded.trim()
      ? forwarded.split(",")[0].trim()
      : ("ip" in ctx.req && typeof ctx.req.ip === "string" && ctx.req.ip) || ctx.req.socket?.remoteAddress || "unknown";
    if (!allowAnonymousCurationSignal(ip)) return { accepted: false as const };
    const db = await requireDb();
    const stored = (await db.select().from(settings).where(eq(settings.settingKey, HOME_MINICLIP_CURATION_SETTING)).limit(1))[0];
    const next = incrementHomeMiniclipCurationSignal(parseHomeMiniclipCurationSignals(stored?.settingValue), input.action, input.mediaId);
    const settingValue = JSON.stringify(next);
    if (stored) await db.update(settings).set({ settingValue }).where(eq(settings.id, stored.id));
    else await db.insert(settings).values({ settingKey: HOME_MINICLIP_CURATION_SETTING, settingValue });
    return { accepted: true as const };
  }),
  backgroundClips: protectedProcedure.query(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    return db.select().from(mediaAssets).where(and(eq(mediaAssets.mediaType, "vídeo"), eq(mediaAssets.state, "Ativo"), isNull(mediaAssets.deletedAt))).orderBy(desc(mediaAssets.backgroundEligible), desc(mediaAssets.backgroundPriority), desc(mediaAssets.createdAt));
  }),
  eligibleMiniclips: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
    const db = await requireDb();
    const scope = await scopedMediaWhere(db, ctx.user, false);
    return db.select().from(mediaAssets).where(and(scope, eq(mediaAssets.mediaType, "vídeo"), eq(mediaAssets.state, "Ativo"), eq(mediaAssets.publicationAllowed, true), isNotNull(mediaAssets.durationSeconds), lte(mediaAssets.durationSeconds, 60))).orderBy(desc(mediaAssets.createdAt));
  }),
  list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(80).default(40), offset: z.number().int().min(0).default(0) }).optional()).query(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role);
    const db = await requireDb();
    const limit = input?.limit ?? 40;
    const offset = input?.offset ?? 0;
    const whereClause = await scopedMediaWhere(db, ctx.user, false);
    const totalRow = await db.select({ value: count() }).from(mediaAssets).where(whereClause);
    const items = await db.select().from(mediaAssets).where(whereClause).orderBy(desc(mediaAssets.createdAt)).limit(limit).offset(offset);
    return { items, total: Number(totalRow[0]?.value || 0), hasMore: offset + items.length < Number(totalRow[0]?.value || 0) };
  }),
  trashList: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(80).default(40), offset: z.number().int().min(0).default(0) }).optional()).query(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role);
    const db = await requireDb();
    const limit = input?.limit ?? 40;
    const offset = input?.offset ?? 0;
    const whereClause = await scopedMediaWhere(db, ctx.user, true);
    const totalRow = await db.select({ value: count() }).from(mediaAssets).where(whereClause);
    const items = await db.select().from(mediaAssets).where(whereClause).orderBy(desc(mediaAssets.deletedAt)).limit(limit).offset(offset);
    return { items, total: Number(totalRow[0]?.value || 0), hasMore: offset + items.length < Number(totalRow[0]?.value || 0) };
  }),
  usages: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Mídia não encontrada." });
    await assertMediaScope(db, ctx.user, current);
    return collectMediaUsages(db, current.id);
  }),
  retentionOverview: protectedProcedure.query(async ({ ctx }) => {
    requireSuperAdmin(ctx.user.role);
    const db = await requireDb();
    const now = new Date();
    const [occupancy, abandoned, unlinked, trash, policy] = await Promise.all([
      mediaOccupancy(db),
      listAbandonedUploadSessions(db, now),
      listUnlinkedUploadSessions(db),
      db.select({ id: mediaAssets.id, filename: mediaAssets.filename, deletedAt: mediaAssets.deletedAt, storageKey: mediaAssets.storageKey, fileSize: mediaAssets.fileSize }).from(mediaAssets).where(isNotNull(mediaAssets.deletedAt)).orderBy(desc(mediaAssets.deletedAt)).limit(80),
      loadStorageQuotaPolicy(db),
    ]);
    return {
      occupancy,
      quota: {
        policy,
        globalDecision: quotaDecision(occupancy.recordedBytes, policy.globalAlertBytes, policy.globalBlockBytes),
        tigrisFreeTierIsNotProductLimit: true,
      },
      trash,
      abandonedUploads: abandoned.map(item => ({
        id: item.session.id,
        filename: item.session.filename,
        status: item.session.status,
        createdAt: item.session.createdAt,
        storageKey: item.session.storageKey,
        fileSize: item.session.fileSize,
        klass: item.klass,
      })),
      technicalUploads: unlinked.map(session => ({
        id: session.id,
        filename: session.filename,
        status: session.status,
        createdAt: session.createdAt,
        storageKey: session.storageKey,
        fileSize: session.fileSize,
      })),
      artifacts: GENERATED_ARTIFACT_INVENTORY,
      policy: {
        abandonedIncompleteHours: 24,
        orphanCompletedDays: 7,
        mediaPurgeRequiresTrash: true,
        auditEventsAreNotTrash: true,
      },
    };
  }),
  cleanupAbandonedUploads: protectedProcedure.input(z.object({ uploadId: z.string().min(8).max(96).optional(), force: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    requireSuperAdmin(ctx.user.role);
    const db = await requireDb();
    if (input.uploadId) {
      const session = (await db.select().from(uploadSessions).where(eq(uploadSessions.id, input.uploadId)).limit(1))[0];
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão de upload não encontrada." });
      try {
        await cleanupAbandonedUploadSession(db, ctx.user.id, session, new Date(), { force: Boolean(input.force) });
        return { cleanedUploadSessionIds: [session.id], failed: [] };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível limpar a sessão." });
      }
    }
    if (input.force) {
      const unlinked = await listUnlinkedUploadSessions(db);
      const cleaned: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];
      for (const session of unlinked) {
        try {
          await cleanupAbandonedUploadSession(db, ctx.user.id, session, new Date(), { force: true });
          cleaned.push(session.id);
        } catch (error) {
          failed.push({ id: session.id, error: error instanceof Error ? error.message : "falha" });
        }
      }
      return { cleanedUploadSessionIds: cleaned, failed };
    }
    return cleanupExpiredAbandonedUploads(db, ctx.user.id);
  }),
  setStorageQuota: protectedProcedure.input(z.object({
    userAlertBytes: z.number().int().positive(),
    userBlockBytes: z.number().int().positive(),
    globalAlertBytes: z.number().int().positive(),
    globalBlockBytes: z.number().int().positive(),
    userUploadsPerWindow: z.number().int().min(1).max(200),
    globalUploadsPerWindow: z.number().int().min(1).max(2000),
    windowMinutes: z.number().int().min(1).max(1440),
  })).mutation(async ({ ctx, input }) => {
    requireSuperAdmin(ctx.user.role);
    if (input.userBlockBytes <= input.userAlertBytes || input.globalBlockBytes <= input.globalAlertBytes) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "O bloqueio precisa ser maior que o alerta." });
    }
    const db = await requireDb();
    await saveStorageQuotaPolicy(db, { ...DEFAULT_STORAGE_QUOTA, ...input }, ctx.user.id);
    await recordAuditEvent(db, { actorId: ctx.user.id, resourceType: "settings", resourceId: null, action: "storage-quota-updated", nextState: { globalAlertBytes: input.globalAlertBytes, globalBlockBytes: input.globalBlockBytes }, detail: "Quota operacional atualizada. Franquia gratuita do Tigris não é limite de produto." });
    return { success: true };
  }),
  create: protectedProcedure.input(z.object({
    mediaType: z.enum(["foto", "vídeo"]), assetUrl: z.string().trim().max(2048).refine(value => /^https?:\/\//i.test(value) || /^\/(media-storage|manus-storage)\/[A-Za-z0-9._\-/]+$/.test(value), { message: "A referência de mídia precisa ser uma URL válida ou um caminho interno do Acervo." }), storageKey: z.string().max(512).optional(), filename: z.string().max(280).optional(), origin: z.string().min(2).max(280), credit: z.string().min(2).max(280), authorization: z.enum(["Cessão", "Licença", "Domínio público", "Autoral própria", "Pendente"]), purpose: z.string().min(2).max(280), publicationAllowed: z.boolean(), projectCoverage: z.string().max(280).optional(), terms: z.string().max(5000).optional(), usageExpiresAt: z.date().optional(), durationSeconds: z.number().int().min(1).max(60).optional(), backgroundEligible: z.boolean().optional(), backgroundPriority: z.number().int().min(0).max(99).optional(), uploadId: z.string().min(12).max(96).optional(), partnerId: z.number().int().positive().nullable().optional(), territoryId: z.number().int().positive().nullable().optional(), photographerId: z.number().int().positive().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role);
    const db = await requireDb();
    const upload = input.uploadId ? (await db.select().from(uploadSessions).where(eq(uploadSessions.id, input.uploadId)).limit(1))[0] : null;
    if (input.uploadId && (!upload || upload.userId !== ctx.user.id || !["Pronto", "Aprovado", "Publicado"].includes(upload.status) || !upload.assetUrl || !upload.storageKey)) throw new TRPCError({ code: "BAD_REQUEST", message: "Conclua um upload seu antes de registrá-lo no Acervo." });
    if (upload && (upload.assetUrl !== input.assetUrl || upload.storageKey !== input.storageKey)) throw new TRPCError({ code: "BAD_REQUEST", message: "A referência da mídia não corresponde à sessão de upload concluída." });
    const partnerId = upload?.partnerId ?? input.partnerId ?? null;
    const territoryId = upload?.territoryId ?? input.territoryId ?? null;
    let scopedPartnerId = partnerId;
    let scopedTerritoryId = territoryId;
    try {
      const scope = await resolveAuthenticatedScope({ db, actor: ctx.user, requestedPartnerId: partnerId, requestedTerritoryId: territoryId, resourceLabel: "este registro de mídia" });
      scopedPartnerId = scope.partnerId;
      scopedTerritoryId = scope.territoryId;
    } catch (error) {
      throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Você não possui escopo para registrar esta mídia." });
    }
    const durationSeconds = upload?.durationSeconds ?? input.durationSeconds;
    if (input.mediaType === "vídeo" && !durationSeconds) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a duração confirmada do vídeo. Vídeos documentais devem ter até 60 segundos." });
    const { uploadId, partnerId: _partnerId, territoryId: _territoryId, photographerId: requestedPhotographerId, ...values } = input;
    const credited = await resolvePhotographerCredit(db, ctx.user, requestedPhotographerId, scopedPartnerId, input.credit);
    const homeSequence = ctx.user.role === "administrador principal" ? { backgroundEligible: values.backgroundEligible ?? false, backgroundPriority: values.backgroundPriority ?? 0 } : { backgroundEligible: false, backgroundPriority: 0 };
    const result = await db.insert(mediaAssets).values({ ...values, ...homeSequence, credit: credited.credit, photographerId: credited.photographerId, storageKey: upload?.storageKey ?? values.storageKey, filename: upload?.filename ?? values.filename, fileSize: upload?.fileSize ?? undefined, durationSeconds, partnerId: scopedPartnerId, territoryId: scopedTerritoryId, uploadId: uploadId ?? null, checksum: upload?.checksum ?? null, uploadStatus: "Pronto", createdBy: ctx.user.id });
    const id = Number(result[0].insertId);
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: scopedPartnerId, territoryId: scopedTerritoryId, resourceType: "media", resourceId: id, action: "media-registered", nextState: { uploadId: uploadId ?? null, mediaType: input.mediaType, publicationAllowed: input.publicationAllowed }, detail: "Mídia registrada no Acervo; publicação permanece dependente de autorização e curadoria." });
    publishEditorialEvent("media-created", id);
    return { id };
  }),
  approveUpload: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current || current.deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "Mídia não encontrada." });
    await assertMediaScope(db, ctx.user, current);
    if (current.uploadStatus !== "Pronto" && current.uploadStatus !== "Aprovado") throw new TRPCError({ code: "BAD_REQUEST", message: "Somente uma mídia pronta pode ser aprovada para uso editorial." });
    await db.update(mediaAssets).set({ uploadStatus: "Aprovado" }).where(eq(mediaAssets.id, current.id));
    if (current.uploadId) await db.update(uploadSessions).set({ status: "Aprovado", approvedBy: ctx.user.id, approvedAt: new Date() }).where(eq(uploadSessions.id, current.uploadId));
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.partnerId, territoryId: current.territoryId, resourceType: "media", resourceId: current.id, action: "media-approved", previousState: { uploadStatus: current.uploadStatus }, nextState: { uploadStatus: "Aprovado" }, detail: "Mídia aprovada para vínculo editorial; aprovação não equivale a publicação." });
    return { success: true };
  }),
  rejectUpload: protectedProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().trim().min(3).max(2000) })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current || current.deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "Mídia não encontrada." });
    await assertMediaScope(db, ctx.user, current);
    await db.update(mediaAssets).set({ uploadStatus: "Rejeitado", state: "Arquivado" }).where(eq(mediaAssets.id, current.id));
    if (current.uploadId) await db.update(uploadSessions).set({ status: "Rejeitado", errorMessage: input.reason, rejectedBy: ctx.user.id, rejectedAt: new Date() }).where(eq(uploadSessions.id, current.uploadId));
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.partnerId, territoryId: current.territoryId, resourceType: "media", resourceId: current.id, action: "media-rejected", previousState: { uploadStatus: current.uploadStatus }, nextState: { uploadStatus: "Rejeitado" }, detail: input.reason });
    return { success: true };
  }),
  update: protectedProcedure.input(z.object({ id: z.number().int().positive(), origin: z.string().min(2).max(280), credit: z.string().min(2).max(280), authorization: z.enum(["Cessão", "Licença", "Domínio público", "Autoral própria", "Pendente"]), purpose: z.string().min(2).max(280), projectCoverage: z.string().max(280).nullable().optional(), terms: z.string().max(5000).nullable().optional(), usageExpiresAt: z.date().nullable().optional(), publicationAllowed: z.boolean(), backgroundPriority: z.number().int().min(0).max(99).optional(), photographerId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Mídia não encontrada." });
    if (current.deletedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Restaure a mídia antes de editar seus metadados." });
    await assertMediaScope(db, ctx.user, current);
    const { id, photographerId, ...values } = input;
    const credited = await resolvePhotographerCredit(db, ctx.user, photographerId, current.partnerId, input.credit);
    const updated = await db.update(mediaAssets).set({ ...values, credit: credited.credit, photographerId: credited.photographerId, version: current.version + 1 }).where(and(eq(mediaAssets.id, id), eq(mediaAssets.version, current.version)));
    if (!updated[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta mídia foi atualizada por outra pessoa. Reabra o Acervo antes de salvar." });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.partnerId, territoryId: current.territoryId, resourceType: "media", resourceId: id, action: "media-updated", previousState: { version: current.version }, nextState: { version: current.version + 1 }, detail: "Metadados e direitos da mídia atualizados." });
    publishEditorialEvent("media-updated", id);
    return { success: true };
  }),
  archive: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Mídia não encontrada." });
    if (current.deletedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "A mídia está na lixeira e deve ser restaurada pelo Super Admin." });
    await assertMediaScope(db, ctx.user, current);
    const archived = await db.update(mediaAssets).set({ state: "Arquivado", backgroundEligible: false, version: current.version + 1 }).where(and(eq(mediaAssets.id, input.id), eq(mediaAssets.version, current.version)));
    if (!archived[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta mídia foi alterada por outra pessoa. Reabra o Acervo antes de arquivar." });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.partnerId, territoryId: current.territoryId, resourceType: "media", resourceId: input.id, action: "media-archived", previousState: { state: current.state }, nextState: { state: "Arquivado" }, detail: "Mídia arquivada e retirada de usos ativos." });
    publishEditorialEvent("media-archived", input.id);
    return { success: true };
  }),
  reactivate: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requireAdmin(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Mídia não encontrada." });
    if (current.deletedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "A mídia está na lixeira e deve ser restaurada pelo Super Admin." });
    await assertMediaScope(db, ctx.user, current);
    if (current.storageKey) {
      const inspect = await inspectMediaObject(current);
      if (inspect.status === "absent") throw new TRPCError({ code: "BAD_REQUEST", message: "O objeto físico não está no storage. Esta reativação foi recusada." });
      if (inspect.status !== "present") throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível confirmar o objeto no storage para reativar." });
    }
    const reactivated = await db.update(mediaAssets).set({ state: "Ativo", version: current.version + 1 }).where(and(eq(mediaAssets.id, input.id), eq(mediaAssets.version, current.version)));
    if (!reactivated[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta mídia foi alterada por outra pessoa. Reabra o Acervo antes de reativar." });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.partnerId, territoryId: current.territoryId, resourceType: "media", resourceId: input.id, action: "media-reactivated", previousState: { state: current.state }, nextState: { state: "Ativo" }, detail: "Mídia reativada no Acervo após confirmação de escopo e existência do objeto." });
    publishEditorialEvent("media-reactivated", input.id);
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number().int().positive(), note: z.string().trim().min(3).max(5000) })).mutation(async ({ ctx, input }) => {
    requireSuperAdmin(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Mídia não encontrada." });
    if (current.deletedAt) return { success: true };
    await db.update(mediaAssets).set({ state: "Arquivado", backgroundEligible: false, deletedAt: new Date(), deletedBy: ctx.user.id, deletionNote: input.note }).where(eq(mediaAssets.id, input.id));
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.partnerId, territoryId: current.territoryId, resourceType: "media", resourceId: current.id, action: "media-trashed", previousState: { state: current.state }, nextState: { deletedAt: "now" }, detail: input.note });
    publishEditorialEvent("media-trashed", input.id);
    return { success: true };
  }),
  restore: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requireSuperAdmin(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Mídia não encontrada. Depois de um expurgo definitivo não existe restauração." });
    try {
      await restoreMediaIfRecoverable(db, ctx.user.id, current);
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "A restauração foi recusada." });
    }
    publishEditorialEvent("media-restored", input.id);
    return { success: true };
  }),
  purge: protectedProcedure.input(z.object({ id: z.number().int().positive(), confirmation: z.string().trim().min(1).max(280) })).mutation(async ({ ctx, input }) => {
    requireSuperAdmin(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current) return { success: true, alreadyPurged: true, uploadSessionRemoved: false, storageAlreadyAbsent: true };
    try {
      const result = await purgeMediaAsset(db, ctx.user.id, current, input.confirmation);
      publishEditorialEvent("media-permanently-purged", input.id);
      return result;
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "O expurgo não foi concluído." });
    }
  }),
  createBackgroundClip: protectedProcedure.input(z.object({
    assetUrl: z.string().trim().max(2048).refine(value => /^https?:\/\//i.test(value) || /^\/(media-storage|manus-storage)\/[A-Za-z0-9._\-/]+$/.test(value), { message: "A referência do vídeo precisa ser válida." }), storageKey: z.string().max(512).optional(), filename: z.string().max(280).optional(), origin: z.string().min(2).max(280), credit: z.string().min(2).max(280), authorization: z.enum(["Cessão", "Licença", "Domínio público", "Autoral própria", "Pendente"]), purpose: z.string().min(2).max(280),     durationSeconds: z.number().int().min(1).max(60), priority: z.number().int().min(0).max(99), captionTrackUrl: z.string().trim().max(2048).optional(),
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const activeCount = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.backgroundEligible, true), eq(mediaAssets.mediaType, "vídeo"), eq(mediaAssets.state, "Ativo")));
    if (activeCount.length >= HOME_MINICLIP_SEQUENCE_LIMIT) throw new TRPCError({ code: "BAD_REQUEST", message: "A sequência do fundo vivo comporta até quatro miniclipes. Remova um da sequência antes de adicionar outro." });
    const captionTrackUrl = input.captionTrackUrl?.trim();
    if (captionTrackUrl && !encodeBackgroundClipTerms(captionTrackUrl)) throw new TRPCError({ code: "BAD_REQUEST", message: "A faixa de legenda precisa ser um arquivo .vtt interno do Acervo, autorizado pela casa." });
    const result = await db.insert(mediaAssets).values({ mediaType: "vídeo", assetUrl: input.assetUrl, storageKey: input.storageKey, filename: input.filename, origin: input.origin, credit: input.credit, authorization: input.authorization, purpose: input.purpose, publicationAllowed: true, backgroundEligible: true, backgroundPriority: input.priority, durationSeconds: input.durationSeconds, terms: encodeBackgroundClipTerms(captionTrackUrl), createdBy: ctx.user.id });
    const id = Number(result[0].insertId); publishEditorialEvent("background-clip-created", id);
    return { id };
  }),
  setBackgroundClip: protectedProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean(), priority: z.number().int().min(0).max(99).optional() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current || current.mediaType !== "vídeo") throw new TRPCError({ code: "NOT_FOUND", message: "Miniclipe não encontrado." });
    if (input.active && (!canActivateBackgroundClip(current) || !current.durationSeconds || current.durationSeconds > HOME_MINICLIP_MAX_DURATION_SECONDS)) throw new TRPCError({ code: "BAD_REQUEST", message: "O miniclipe precisa estar ativo, autorizado e ter no máximo 60 segundos." });
    if (input.active && !current.backgroundEligible) {
      const activeCount = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.backgroundEligible, true), eq(mediaAssets.mediaType, "vídeo"), eq(mediaAssets.state, "Ativo")));
      if (activeCount.length >= HOME_MINICLIP_SEQUENCE_LIMIT) throw new TRPCError({ code: "BAD_REQUEST", message: "A sequência do fundo vivo comporta até quatro miniclipes. Remova um da sequência antes de ativar outro." });
    }
    await db.update(mediaAssets).set({ backgroundEligible: input.active, backgroundPriority: input.active ? (input.priority ?? current.backgroundPriority) : 0 }).where(eq(mediaAssets.id, input.id)); publishEditorialEvent("background-clip-updated", input.id);
    return { success: true };
  }),
  setBackgroundCaption: protectedProcedure.input(z.object({ id: z.number().int().positive(), captionTrackUrl: z.string().trim().max(2048).optional() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.id)).limit(1))[0];
    if (!current || current.mediaType !== "vídeo") throw new TRPCError({ code: "NOT_FOUND", message: "Miniclipe não encontrado." });
    const captionTrackUrl = input.captionTrackUrl?.trim();
    if (captionTrackUrl && !encodeBackgroundClipTerms(captionTrackUrl)) throw new TRPCError({ code: "BAD_REQUEST", message: "A faixa de legenda precisa ser um arquivo .vtt interno do Acervo, autorizado pela casa." });
    await db.update(mediaAssets).set({ terms: encodeBackgroundClipTerms(captionTrackUrl) }).where(eq(mediaAssets.id, input.id));
    publishEditorialEvent("background-clip-updated", input.id);
    return { success: true };
  }),
  saveHomeBackgroundConfig: protectedProcedure.mutation(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const settingValue = JSON.stringify(defaultHeroTransition);
    const existing = (await db.select({ id: settings.id }).from(settings).where(eq(settings.settingKey, "homeHeroVideoTransition")).limit(1))[0];
    if (existing) await db.update(settings).set({ settingValue, updatedBy: ctx.user.id }).where(eq(settings.id, existing.id));
    else await db.insert(settings).values({ settingKey: "homeHeroVideoTransition", settingValue, updatedBy: ctx.user.id });
    publishEditorialEvent("home-background-config-updated");
    return defaultHeroTransition;
  }),
  users: protectedProcedure.query(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn }).from(users).orderBy(users.name);
  }),
});
