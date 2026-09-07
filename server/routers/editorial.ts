import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, like, lte, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { commercialEditorialAuthorizations, editorialActivities, highlightSuggestions, mediaAssets, networkExecutors, publicationMedia, publicationRelations, publicationTaxonomies, publications, taxonomies, taxonomyMedia, teams, users } from "../../drizzle/schema";
import { canAdvanceStatus, canEditPublication, canPublishDirect, nextEditorialStatus, type ContentStatus, type EditorialRole } from "../editorialPolicy";
import { getDb } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { publishEditorialEvent } from "../editorialEvents";
import { canUseCommercialLocation, canUseCommercialMedia, canUseCommercialNarrative, canUseOnPortal, type CommercialEditorialAuthorization } from "../commercialEditorialAuthorization";
import { activePartnerMemberships, assertPartnerScope, canAccessCentralPublication, canAccessOwnOperatorRecord, recordAuditEvent, resolveAuthenticatedScope } from "../partnerScope";
import { editorialTrashDeadline, isEditorialTrashExpired, permanentlyPurgePublication } from "../editorialTrash";
import { confirmPhrasesMatch } from "@shared/confirmPhrase";
import { isHomeCurated, sortHomeCurated } from "../editorialScale";
import { groupDuplicateTeamIds, pickReusableTeam } from "@shared/teamCredits";
import { MAX_MINICLIPS, MAX_PHOTOS } from "@shared/const";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function resolveTeamId(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  teamId?: number | null,
  teamCredit?: string | null,
  createdBy?: number,
) {
  if (teamId) {
    const current = (await db.select().from(teams).where(eq(teams.id, teamId)).limit(1))[0];
    if (current && !current.archivedAt) return current.id;
  }
  const name = teamCredit?.trim();
  if (!name) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe ou selecione a equipe responsável." });
  const catalog = await db.select().from(teams);
  const reusable = pickReusableTeam(catalog, name);
  if (reusable) return reusable.id;
  const slug = `${slugify(name)}-${Date.now().toString(36)}`;
  const created = await db.insert(teams).values({ name, slug, createdBy: createdBy ?? null });
  return Number(created[0].insertId);
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

function assertAdmin(role: EditorialRole) {
  if (!["administrador", "administrador principal"].includes(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem executar esta ação." });
}

function assertPrincipal(role: EditorialRole) {
  if (role !== "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Super Admin pode excluir ou restaurar conteúdos." });
}

function assertTaxonomyWrite(role: string, actorId: number, createdBy: number | null | undefined) {
  if (canAccessOwnOperatorRecord(role, actorId, createdBy)) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: createdBy == null
      ? "Este cadastro é do catálogo nacional. Somente o Super Admin pode alterá-lo."
      : "Este cadastro é de outro admin.",
  });
}

async function portalCoversByPublicationId(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, publicationIds: number[]) {
  const coverLinks = publicationIds.length ? await db.select().from(publicationMedia).where(inArray(publicationMedia.publicationId, publicationIds)).orderBy(publicationMedia.displayOrder) : [];
  const mediaIds = Array.from(new Set(coverLinks.map(link => link.mediaId)));
  const covers = mediaIds.length ? await db.select().from(mediaAssets).where(and(inArray(mediaAssets.id, mediaIds), eq(mediaAssets.publicationAllowed, true), eq(mediaAssets.state, "Ativo"), isNull(mediaAssets.deletedAt))) : [];
  const coverById = new Map(covers.map(item => [item.id, item]));
  const firstCoverByPublication = new Map<number, typeof covers[number]>();
  for (const link of coverLinks) {
    if (firstCoverByPublication.has(link.publicationId)) continue;
    const cover = coverById.get(link.mediaId);
    if (cover) firstCoverByPublication.set(link.publicationId, cover);
  }
  return firstCoverByPublication;
}

async function publicationTerritoryIds(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, publicationId: number) {
  const links = await db.select({ taxonomyId: publicationTaxonomies.taxonomyId }).from(publicationTaxonomies).where(eq(publicationTaxonomies.publicationId, publicationId));
  if (!links.length) return [];
  const rows = await db.select({ id: taxonomies.id }).from(taxonomies).where(and(inArray(taxonomies.id, links.map(link => link.taxonomyId)), eq(taxonomies.dimension, "Território")));
  return rows.map(row => row.id);
}

async function assertPublicationScope(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, actor: { id: number; role: string }, publication: typeof publications.$inferSelect, label: string) {
  if (actor.role === "administrador principal") return;
  if (!canAccessOwnOperatorRecord(actor.role, actor.id, publication.createdBy)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Este conteúdo é de outro admin." });
  }
  const memberships = await activePartnerMemberships(db, actor.id);
  if (!canAccessCentralPublication(false, memberships.length > 0, publication.partnerId ?? null)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Este conteúdo pertence à operação nacional e está fora do escopo do seu Parceiro Ojú." });
  }
  if (!publication.partnerId) return;
  const territoryIds = await publicationTerritoryIds(db, publication.id);
  try { await assertPartnerScope({ db, actor, partnerId: publication.partnerId, territoryIds, resourceLabel: label, requirePartner: true }); }
  catch (error) { throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Você não possui escopo territorial para esta publicação." }); }
}

async function scopedPublicationIds(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, actor: { id: number; role: string }) {
  if (actor.role === "administrador principal") return "all" as const;
  const own = await db.select({ id: publications.id }).from(publications).where(and(isNull(publications.deletedAt), eq(publications.createdBy, actor.id)));
  return own.map(row => row.id);
}

async function getMatchingPublicationIds(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, taxonomyIds: number[]) {
  if (!taxonomyIds.length) return null;
  const groups = await Promise.all(taxonomyIds.map(id => db.select({ publicationId: publicationTaxonomies.publicationId }).from(publicationTaxonomies).where(eq(publicationTaxonomies.taxonomyId, id))));
  const first = groups[0]?.map(row => row.publicationId) ?? [];
  return first.filter(id => groups.every(group => group.some(row => row.publicationId === id)));
}

type PortalPublication = Pick<typeof publications.$inferSelect, "status" | "isPublic" | "commercialRequestId" | "quarantinedAt" | "deletedAt">;

export function requiresCommercialEditorialAuthorization(publication: Pick<PortalPublication, "commercialRequestId">) {
  return publication.commercialRequestId !== null;
}

export function canExposeOnPublicPortal(publication: PortalPublication, authorization?: boolean | CommercialEditorialAuthorization | null) {
  const authorized = typeof authorization === "boolean" ? authorization : canUseOnPortal(authorization);
  return publication.status === "Publicada" && publication.isPublic && !publication.quarantinedAt && !publication.deletedAt && (!requiresCommercialEditorialAuthorization(publication) || authorized);
}

export function recordPhotoCap(contentKind: string, photoLimit: number | null) {
  if (contentKind === "Fotografia documental") return MAX_PHOTOS;
  const requested = photoLimit ?? MAX_PHOTOS;
  return Math.min(Math.max(requested, 0), MAX_PHOTOS);
}

export function recordVideoCap(contentKind: string, videoLimit: number | null) {
  if (contentKind === "Fotografia documental") return 0;
  const requested = videoLimit ?? MAX_MINICLIPS;
  return Math.min(Math.max(requested, 0), MAX_MINICLIPS);
}

export function canAttachWithinMediaLimit(input: { contentKind: string; mediaType: "foto" | "vídeo"; photoLimit: number | null; videoLimit: number | null; attachedPhotoCount: number; attachedVideoCount: number; hasEventRelation?: boolean }) {
  if (input.mediaType === "foto") return input.attachedPhotoCount < recordPhotoCap(input.contentKind, input.photoLimit);
  return input.attachedVideoCount < recordVideoCap(input.contentKind, input.videoLimit);
}

export function balanceFeaturedPublications<T extends { contentKind: string }>(orderedPublications: T[], maximum = 6) {
  const firstOfEachKind: T[] = [];
  const remaining: T[] = [];
  for (const publication of orderedPublications) (firstOfEachKind.some(item => item.contentKind === publication.contentKind) ? remaining : firstOfEachKind).push(publication);
  return [...firstOfEachKind, ...remaining].slice(0, maximum);
}

export function toPortalPublication<T extends typeof publications.$inferSelect>(publication: T, authorization: CommercialEditorialAuthorization | null) {
  const { commercialRequestId: _commercialRequestId, teamId: _teamId, createdBy: _createdBy, editedBy: _editedBy, approvedBy: _approvedBy, unpublishedAt: _unpublishedAt, unpublishedBy: _unpublishedBy, deletedAt: _deletedAt, deletedBy: _deletedBy, deletionNote: _deletionNote, version: _version, ...safePublication } = publication;
  return {
    ...safePublication,
    editorialAuthorization: requiresCommercialEditorialAuthorization(publication)
      ? {
          materialFromCommercialCoverage: true as const,
          status: authorization?.status ?? "Pendente",
          authorized: canUseOnPortal(authorization),
          authorizedAt: authorization?.authorizedAt ?? null,
        }
      : null,
  };
}

async function commercialAuthorizationByRequestId(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  requestId: number | null,
) {
  if (!requestId) return null;
  return (await db.select().from(commercialEditorialAuthorizations).where(eq(commercialEditorialAuthorizations.requestId, requestId)).limit(1))[0] ?? null;
}

async function portalAuthorizedPublications(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  records: (typeof publications.$inferSelect)[],
) {
  const requestIds = Array.from(new Set(records.flatMap(record => record.commercialRequestId ? [record.commercialRequestId] : [])));
  const authorizations = requestIds.length
    ? await db.select().from(commercialEditorialAuthorizations).where(inArray(commercialEditorialAuthorizations.requestId, requestIds))
    : [];
  const byRequestId = new Map(authorizations.map(authorization => [authorization.requestId, authorization]));
  return records
    .map(publication => ({ publication, authorization: publication.commercialRequestId ? (byRequestId.get(publication.commercialRequestId) ?? null) : null }))
    .filter(({ publication, authorization }) => canExposeOnPublicPortal(publication, authorization));
}

async function assertCommercialPublicationCanPublish(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, publication: typeof publications.$inferSelect) {
  const authorization = await commercialAuthorizationByRequestId(db, publication.commercialRequestId);
  if (!requiresCommercialEditorialAuthorization(publication)) return authorization;
  if (!canUseOnPortal(authorization)) throw new TRPCError({ code: "BAD_REQUEST", message: "Este trabalho contratado permanece privado. Registre uma autorização editorial válida, com uso no portal e escopo de conteúdo, antes de publicar." });
  const links = await db.select().from(publicationMedia).where(eq(publicationMedia.publicationId, publication.id));
  const ids = links.map(link => link.mediaId);
  const media = ids.length ? await db.select().from(mediaAssets).where(inArray(mediaAssets.id, ids)) : [];
  if (media.some(item => !canUseCommercialMedia(authorization, item.mediaType))) throw new TRPCError({ code: "BAD_REQUEST", message: "A autorização editorial não permite o tipo de mídia vinculado a esta publicação." });
  if (links.some(link => link.location?.trim()) && !canUseCommercialLocation(authorization)) throw new TRPCError({ code: "BAD_REQUEST", message: "A autorização editorial não permite divulgar localização nesta publicação." });
  const hasNarrative = Boolean(publication.summary?.trim() || publication.body?.trim() || links.some(link => link.caption?.trim() || link.biography?.trim()));
  if (hasNarrative && !canUseCommercialNarrative(authorization)) throw new TRPCError({ code: "BAD_REQUEST", message: "A autorização editorial não permite divulgar descrição, história ou biografia neste material." });
  return authorization;
}

export const searchInput = z.object({
  query: z.string().trim().max(160).optional(),
  themeId: z.number().int().positive().optional(),
  territoryId: z.number().int().positive().optional(),
  contentTypeId: z.number().int().positive().optional(),
  organizationId: z.number().int().positive().optional(),
  contentKind: z.enum(["História", "Cobertura", "Documentário", "Projeto", "Fotografia documental"]).optional(),
  photographerId: z.number().int().positive().optional(),
  partnerId: z.number().int().positive().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().min(1).max(48).default(24),
  offset: z.number().int().min(0).default(0),
});
export const photoDocumentaryInput = z.object({
  limit: z.number().int().min(1).max(24).default(8),
  offset: z.number().int().min(0).default(0),
});
export const adminListInput = z.object({
  limit: z.number().int().min(1).max(100).default(40),
  offset: z.number().int().min(0).default(0),
  status: z.enum(["Rascunho", "Em revisão", "Aprovada", "Publicada", "Arquivada"]).optional(),
  contentKind: z.enum(["História", "Cobertura", "Documentário", "Projeto", "Fotografia documental"]).optional(),
  query: z.string().trim().max(160).optional(),
  publishedOnly: z.boolean().optional(),
  createdByMe: z.boolean().optional(),
});

export const editorialRouter = router({
  taxonomies: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select({
      id: taxonomies.id,
      dimension: taxonomies.dimension,
      name: taxonomies.name,
      slug: taxonomies.slug,
      description: taxonomies.description,
      parentId: taxonomies.parentId,
      latitude: taxonomies.latitude,
      longitude: taxonomies.longitude,
      mapVisibility: taxonomies.mapVisibility,
      createdAt: taxonomies.createdAt,
    }).from(taxonomies).orderBy(taxonomies.dimension, taxonomies.name);
  }),

  adminTaxonomies: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx.user.role as EditorialRole);
    const db = await requireDb();
    return db.select().from(taxonomies).orderBy(taxonomies.dimension, taxonomies.name);
  }),

  publicTerritories: publicProcedure.query(async () => {
    const db = await requireDb();
    const territories = await db.select().from(taxonomies).where(eq(taxonomies.dimension, "Território")).orderBy(taxonomies.name);
    if (!territories.length) return [];
    const territoryIds = territories.map(item => item.id);
    const relations = await db.select().from(publicationTaxonomies).where(inArray(publicationTaxonomies.taxonomyId, territoryIds));
    const relationPublicationIds = Array.from(new Set(relations.map(item => item.publicationId)));
    const published = relationPublicationIds.length ? await db.select({ id: publications.id }).from(publications).where(and(inArray(publications.id, relationPublicationIds), eq(publications.status, "Publicada"), eq(publications.isPublic, true), isNull(publications.deletedAt), isNull(publications.quarantinedAt))) : [];
    const publishedIds = new Set(published.map(item => item.id));
    const mediaLinks = await db.select().from(taxonomyMedia).where(inArray(taxonomyMedia.taxonomyId, territoryIds)).orderBy(desc(taxonomyMedia.isPrimary), taxonomyMedia.displayOrder);
    const mediaIds = Array.from(new Set(mediaLinks.map(item => item.mediaId)));
    const assets = mediaIds.length ? await db.select().from(mediaAssets).where(and(inArray(mediaAssets.id, mediaIds), eq(mediaAssets.publicationAllowed, true), eq(mediaAssets.state, "Ativo"), isNull(mediaAssets.deletedAt))) : [];
    return territories.map(territory => {
      const territoryMedia = mediaLinks.filter(link => link.taxonomyId === territory.id).map(link => assets.find(asset => asset.id === link.mediaId)).find(Boolean);
      const contentCount = relations.filter(link => link.taxonomyId === territory.id && publishedIds.has(link.publicationId)).length;
      return { id: territory.id, name: territory.name, slug: territory.slug, description: territory.description, contentCount, media: territoryMedia ? { id: territoryMedia.id, assetUrl: territoryMedia.assetUrl, mediaType: territoryMedia.mediaType, credit: territoryMedia.credit } : null };
    });
  }),

  search: publicProcedure.input(searchInput).query(async ({ input }) => {
    const db = await requireDb();
    const taxonomyIds = [input.themeId, input.territoryId, input.contentTypeId, input.organizationId].filter((id): id is number => Boolean(id));
    const matchingIds = await getMatchingPublicationIds(db, taxonomyIds);
    if (matchingIds && matchingIds.length === 0) return { items: [], total: 0, hasMore: false };
    let photographerPublicationIds: number[] | null = null;
    if (input.photographerId) {
      const credited = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.photographerId, input.photographerId), isNull(mediaAssets.deletedAt)));
      const mediaIds = credited.map(item => item.id);
      const links = mediaIds.length ? await db.select({ publicationId: publicationMedia.publicationId }).from(publicationMedia).where(inArray(publicationMedia.mediaId, mediaIds)) : [];
      photographerPublicationIds = Array.from(new Set(links.map(link => link.publicationId)));
      if (!photographerPublicationIds.length) return { items: [], total: 0, hasMore: false };
    }
    const conditions = [];
    conditions.push(and(eq(publications.status, "Publicada"), eq(publications.isPublic, true), isNull(publications.deletedAt), isNull(publications.quarantinedAt))!);
    if (matchingIds) conditions.push(inArray(publications.id, matchingIds));
    if (photographerPublicationIds) conditions.push(inArray(publications.id, photographerPublicationIds));
    if (input.contentKind) conditions.push(eq(publications.contentKind, input.contentKind));
    if (input.partnerId) conditions.push(eq(publications.partnerId, input.partnerId));
    if (input.query) {
      const term = `%${input.query}%`;
      conditions.push(or(like(publications.title, term), like(publications.summary, term), like(publications.body, term))!);
    }
    if (input.startDate) conditions.push(gte(publications.publishedAt, input.startDate));
    if (input.endDate) conditions.push(lte(publications.publishedAt, input.endDate));
    const whereClause = and(...conditions);
    const totalRow = await db.select({ value: count() }).from(publications).where(whereClause);
    const total = Number(totalRow[0]?.value || 0);
    const records = await db.select().from(publications).where(whereClause).orderBy(desc(publications.publishedAt), desc(publications.createdAt)).limit(input.limit).offset(input.offset);
    const permitted = await portalAuthorizedPublications(db, records);
    const publicationIds = permitted.map(item => item.publication.id);
    const firstCoverByPublication = await portalCoversByPublicationId(db, publicationIds);
    const items = permitted.map(({ publication, authorization }) => {
      const cover = firstCoverByPublication.get(publication.id);
      return { ...toPortalPublication(publication, authorization), coverUrl: cover?.assetUrl ?? null, coverType: cover?.mediaType ?? null, coverCredit: cover?.credit ?? null };
    });
    return { items, total, hasMore: input.offset + records.length < total };
  }),

  featured: publicProcedure.input(z.object({ territoryId: z.number().int().positive().optional() })).query(async ({ input }) => {
    const db = await requireDb();
    const territoryIds = input.territoryId ? await getMatchingPublicationIds(db, [input.territoryId]) : null;
    const geographicTaxonomies = await db.select({ id: taxonomies.id, name: taxonomies.name, dimension: taxonomies.dimension }).from(taxonomies).where(or(eq(taxonomies.dimension, "Território"), eq(taxonomies.dimension, "Localização")));
    const geographicIds = geographicTaxonomies.map(item => item.id);
    const geographicLinks = geographicIds.length ? await db.select().from(publicationTaxonomies).where(inArray(publicationTaxonomies.taxonomyId, geographicIds)) : [];
    const geographicPublicationIds = new Set(geographicLinks.map(link => link.publicationId));
    const conditions = [
      eq(publications.status, "Publicada"),
      eq(publications.isPublic, true),
      isNull(publications.deletedAt),
      isNull(publications.quarantinedAt),
      or(ne(publications.homePlacement, "Nenhum"), eq(publications.manualFeatured, true))!,
    ];
    const records = await db.select().from(publications).where(and(...conditions)).orderBy(desc(publications.manualFeatured), desc(publications.relevance), publications.sponsored, desc(publications.publishedAt)).limit(40);
    const permitted = await portalAuthorizedPublications(db, records);
    const authorizationByPublicationId = new Map(permitted.map(item => [item.publication.id, item.authorization]));
    const curated = sortHomeCurated(permitted.map(item => item.publication).filter(isHomeCurated));
    const territoryPrioritized = curated.sort((a, b) => (territoryIds?.length ? Number(territoryIds.includes(b.id)) - Number(territoryIds.includes(a.id)) : 0) || Number(geographicPublicationIds.has(b.id)) - Number(geographicPublicationIds.has(a.id)));
    const selected = balanceFeaturedPublications(territoryPrioritized);
    const selectedIds = selected.map(item => item.id);
    const firstCoverByPublication = await portalCoversByPublicationId(db, selectedIds);
    const covers = Array.from(firstCoverByPublication.values());
    const photographerIds = Array.from(new Set(covers.map(item => item.photographerId).filter((id): id is number => typeof id === "number")));
    const photographers = photographerIds.length ? await db.select().from(networkExecutors).where(inArray(networkExecutors.id, photographerIds)) : [];
    const photographerById = new Map(photographers.map(item => [item.id, item]));
    const territoryNameByPublication = new Map<number, string>();
    for (const link of geographicLinks) {
      if (territoryNameByPublication.has(link.publicationId)) continue;
      const taxonomy = geographicTaxonomies.find(item => item.id === link.taxonomyId && item.dimension === "Território") || geographicTaxonomies.find(item => item.id === link.taxonomyId);
      if (taxonomy) territoryNameByPublication.set(link.publicationId, taxonomy.name);
    }
    return selected.map(publication => {
      const cover = firstCoverByPublication.get(publication.id);
      const photographer = cover?.photographerId ? photographerById.get(cover.photographerId) : undefined;
      return {
        ...toPortalPublication(publication, authorizationByPublicationId.get(publication.id) ?? null),
        coverUrl: cover?.assetUrl ?? null,
        coverType: cover?.mediaType ?? null,
        coverCredit: cover?.credit ?? null,
        photographerName: photographer?.displayName ?? cover?.credit ?? null,
        photographerSlug: photographer?.publicVisible ? photographer.publicSlug : null,
        territoryName: territoryNameByPublication.get(publication.id) ?? null,
      };
    });
  }),

  photoDocumentary: publicProcedure.input(photoDocumentaryInput).query(async ({ input }) => {
    const db = await requireDb();
    const photos = await db.select().from(publications).where(and(eq(publications.contentKind, "Fotografia documental"), eq(publications.status, "Publicada"), eq(publications.isPublic, true), isNull(publications.deletedAt), isNull(publications.quarantinedAt))).orderBy(desc(publications.publishedAt)).limit(input.offset + input.limit + 24);
    const permitted = await portalAuthorizedPublications(db, photos);
    const page = permitted.slice(input.offset, input.offset + input.limit);
    const collections = await Promise.all(page.map(async ({ publication, authorization }) => {
      const links = await db.select().from(publicationMedia).where(eq(publicationMedia.publicationId, publication.id)).orderBy(publicationMedia.displayOrder);
      const ids = links.map(link => link.mediaId); const media = ids.length ? await db.select().from(mediaAssets).where(and(inArray(mediaAssets.id, ids), isNull(mediaAssets.deletedAt))) : [];
      return { ...toPortalPublication(publication, authorization), photos: links.map(link => ({ ...media.find(item => item.id === link.mediaId), caption: link.caption, biography: link.biography, location: link.location, capturedAt: link.capturedAt })) };
    }));
    return { collections, total: permitted.length, hasMore: input.offset + collections.length < permitted.length };
  }),

  bySlug: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ input }) => {
    const db = await requireDb();
    const result = await db.select().from(publications).where(and(eq(publications.slug, input.slug), eq(publications.status, "Publicada"), eq(publications.isPublic, true), isNull(publications.deletedAt), isNull(publications.quarantinedAt))).limit(1);
    if (!result[0]) return null;
    const authorization = await commercialAuthorizationByRequestId(db, result[0].commercialRequestId);
    if (!canExposeOnPublicPortal(result[0], authorization)) return null;
    const links = await db.select().from(publicationMedia).where(eq(publicationMedia.publicationId, result[0].id));
    const mediaIds = links.map(link => link.mediaId);
    const media = mediaIds.length ? await db.select().from(mediaAssets).where(and(inArray(mediaAssets.id, mediaIds), isNull(mediaAssets.deletedAt))) : [];
    const taxonomyLinks = await db.select().from(publicationTaxonomies).where(eq(publicationTaxonomies.publicationId, result[0].id));
    const taxonomyIds = taxonomyLinks.map(link => link.taxonomyId);
    const publicationTaxonomy = taxonomyIds.length ? await db.select().from(taxonomies).where(inArray(taxonomies.id, taxonomyIds)) : [];
    const photographerIds = Array.from(new Set(media.map(item => item.photographerId).filter((id): id is number => typeof id === "number")));
    const photographers = photographerIds.length ? await db.select({ id: networkExecutors.id, displayName: networkExecutors.displayName, publicSlug: networkExecutors.publicSlug, publicVisible: networkExecutors.publicVisible, profileNote: networkExecutors.profileNote, instagramHandle: networkExecutors.instagramHandle }).from(networkExecutors).where(inArray(networkExecutors.id, photographerIds)) : [];
    const photographerById = new Map(photographers.map(item => [item.id, item]));
    const orderedMedia = media.sort((a, b) => (links.find(link => link.mediaId === a.id)?.displayOrder ?? 0) - (links.find(link => link.mediaId === b.id)?.displayOrder ?? 0)).map(item => {
      const photographer = item.photographerId ? photographerById.get(item.photographerId) : undefined;
      const displayOrder = links.find(link => link.mediaId === item.id)?.displayOrder ?? 0;
      return { ...item, isCover: displayOrder === 0, photographer: photographer ? { id: photographer.id, displayName: photographer.displayName, slug: photographer.publicVisible ? photographer.publicSlug : null, profileNote: photographer.publicVisible ? photographer.profileNote : null, instagramHandle: photographer.publicVisible ? photographer.instagramHandle : null } : null };
    });
    return { ...toPortalPublication(result[0], authorization), media: orderedMedia, taxonomies: publicationTaxonomy };
  }),

  adminList: protectedProcedure.input(adminListInput.optional()).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const limit = input?.limit ?? 40;
    const offset = input?.offset ?? 0;
    const scoped = await scopedPublicationIds(db, ctx.user);
    if (scoped !== "all" && scoped.length === 0) return { items: [], total: 0, hasMore: false };
    const conditions = [isNull(publications.deletedAt)];
    if (scoped !== "all") conditions.push(inArray(publications.id, scoped));
    if (input?.status) conditions.push(eq(publications.status, input.status));
    if (input?.contentKind) conditions.push(eq(publications.contentKind, input.contentKind));
    if (input?.publishedOnly) conditions.push(and(eq(publications.status, "Publicada"), eq(publications.isPublic, true), isNull(publications.quarantinedAt))!);
    if (input?.createdByMe && ctx.user.role === "administrador principal") conditions.push(eq(publications.createdBy, ctx.user.id));
    if (input?.query) {
      const term = `%${input.query}%`;
      conditions.push(or(like(publications.title, term), like(publications.summary, term))!);
    }
    const whereClause = and(...conditions);
    const totalRow = await db.select({ value: count() }).from(publications).where(whereClause);
    const total = Number(totalRow[0]?.value || 0);
    const items = await db.select().from(publications).where(whereClause).orderBy(desc(publications.updatedAt)).limit(limit).offset(offset);
    const covers = await portalCoversByPublicationId(db, items.map(item => item.id));
    const creatorIds = Array.from(new Set(items.map(item => item.createdBy).filter((id): id is number => typeof id === "number")));
    const creators = creatorIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, creatorIds)) : [];
    const creatorById = new Map(creators.map(person => [person.id, person.name || person.email || "Equipe"]));
    return {
      items: items.map(item => {
        const cover = covers.get(item.id);
        return {
          ...item,
          coverUrl: cover?.assetUrl ?? null,
          coverType: cover?.mediaType ?? null,
          createdByName: item.createdBy ? creatorById.get(item.createdBy) || "Equipe" : "Equipe",
        };
      }),
      total,
      hasMore: offset + items.length < total,
    };
  }),

  adminSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const scoped = await scopedPublicationIds(db, ctx.user);
    if (scoped !== "all" && scoped.length === 0) {
      return { counts: { Rascunho: 0, "Em revisão": 0, Aprovada: 0, Publicada: 0, Arquivada: 0 }, scheduled: 0, recent: [] as typeof publications.$inferSelect[] };
    }
    const conditions = [isNull(publications.deletedAt)];
    if (scoped !== "all") conditions.push(inArray(publications.id, scoped));
    const rows = await db.select({ status: publications.status, value: count() }).from(publications).where(and(...conditions)).groupBy(publications.status);
    const counts = { Rascunho: 0, "Em revisão": 0, Aprovada: 0, Publicada: 0, Arquivada: 0 };
    for (const row of rows) counts[row.status] = Number(row.value || 0);
    const scheduledRow = await db.select({ value: count() }).from(publications).where(and(...conditions, eq(publications.status, "Aprovada"), isNotNull(publications.scheduledAt)));
    const recent = await db.select().from(publications).where(and(...conditions)).orderBy(desc(publications.updatedAt)).limit(6);
    return { counts, scheduled: Number(scheduledRow[0]?.value || 0), recent };
  }),

  trashList: protectedProcedure.query(async ({ ctx }) => {
    assertPrincipal(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const rows = await db.select().from(publications).where(isNotNull(publications.deletedAt)).orderBy(desc(publications.deletedAt));
    const deletedByIds = Array.from(new Set(rows.map(row => row.deletedBy).filter((id): id is number => typeof id === "number")));
    const actors = deletedByIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, deletedByIds)) : [];
    const byActor = new Map(actors.map(actor => [actor.id, actor.name || actor.email || "Super Admin"]));
    const now = new Date();
    return rows.map(row => ({ ...row, deletedByName: row.deletedBy ? byActor.get(row.deletedBy) || "Super Admin" : null, restoreUntil: row.deletedAt ? editorialTrashDeadline(row.deletedAt) : null, expired: row.deletedAt ? isEditorialTrashExpired(row.deletedAt, now) : false }));
  }),

  preview: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.select().from(publications).where(eq(publications.id, input.id)).limit(1);
    if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    await assertPublicationScope(db, ctx.user, result[0], "a prévia desta publicação");
    const personIds = [result[0].createdBy, result[0].editedBy, result[0].approvedBy].filter((id): id is number => typeof id === "number");
    const contributors = personIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, personIds)) : [];
    const links = await db.select().from(publicationMedia).where(eq(publicationMedia.publicationId, input.id));
    const mediaIds = links.map(link => link.mediaId);
    const media = mediaIds.length ? await db.select().from(mediaAssets).where(inArray(mediaAssets.id, mediaIds)) : [];
    const taxonomyLinks = await db.select().from(publicationTaxonomies).where(eq(publicationTaxonomies.publicationId, input.id));
    const taxonomyIds = taxonomyLinks.map(link => link.taxonomyId);
    const publicationTaxonomy = taxonomyIds.length ? await db.select().from(taxonomies).where(inArray(taxonomies.id, taxonomyIds)) : [];
    const team = result[0].teamId ? await db.select().from(teams).where(eq(teams.id, result[0].teamId)).limit(1) : [];
    const commercialAuthorization = await commercialAuthorizationByRequestId(db, result[0].commercialRequestId);
    const orderedMedia = media
      .map(item => {
        const link = links.find(entry => entry.mediaId === item.id);
        const displayOrder = link?.displayOrder ?? 99;
        return { ...item, displayOrder, isCover: displayOrder === 0 };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return { ...result[0], teamCredit: team[0]?.name || null, contributors, media: orderedMedia, taxonomies: publicationTaxonomy, commercialEditorial: result[0].commercialRequestId ? { requiresAuthorization: true as const, authorized: canUseOnPortal(commercialAuthorization), authorizedAt: commercialAuthorization?.authorizedAt ?? null, status: commercialAuthorization?.status ?? "Pendente", authorization: commercialAuthorization } : null };
  }),

  create: protectedProcedure.input(z.object({ title: z.string().min(4).max(280), contentKind: z.enum(["História", "Cobertura", "Documentário", "Projeto", "Fotografia documental"]), subtitle: z.string().max(420).optional(), summary: z.string().max(2000).optional(), body: z.string().max(30000).optional(), teamId: z.number().int().positive().optional(), teamCredit: z.string().min(2).max(160).optional(), photoLimit: z.number().int().min(0).max(MAX_PHOTOS).optional(), videoLimit: z.number().int().min(0).max(MAX_MINICLIPS).optional(), partnerId: z.number().int().positive().nullable().optional(), territoryId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const role = ctx.user.role as EditorialRole;
    if (!["criador", "editor", "administrador", "administrador principal"].includes(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Seu papel não pode criar publicações." });
    let scope: Awaited<ReturnType<typeof resolveAuthenticatedScope>>;
    try {
      scope = await resolveAuthenticatedScope({ db, actor: ctx.user, requestedPartnerId: input.partnerId, requestedTerritoryId: input.territoryId, resourceLabel: "esta publicação" });
    } catch (error) {
      throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Você não possui escopo para criar esta publicação." });
    }
    const base = slugify(input.title) || "publicacao";
    const slug = `${base}-${Date.now().toString(36)}`;
    const teamId = await resolveTeamId(db, input.teamId, input.teamCredit, ctx.user.id);
    const { teamCredit: _teamCredit, partnerId: _partnerId, territoryId: _territoryId, ...publicationInput } = input;
    const result = await db.insert(publications).values({ ...publicationInput, partnerId: scope.partnerId, photoLimit: recordPhotoCap(input.contentKind, input.photoLimit ?? null), videoLimit: recordVideoCap(input.contentKind, input.videoLimit ?? null), teamId, slug, createdBy: ctx.user.id, status: "Rascunho", isPublic: false });
    const publicationId = Number(result[0].insertId);
    if (scope.territoryId) await db.insert(publicationTaxonomies).values({ publicationId, taxonomyId: scope.territoryId });
    await db.insert(editorialActivities).values({ publicationId, actorId: ctx.user.id, toStatus: "Rascunho", note: "Publicação criada." });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: scope.partnerId, territoryId: scope.territoryId, resourceType: "publication", resourceId: publicationId, action: "publication-created", nextState: { status: "Rascunho", contentKind: input.contentKind }, detail: "Rascunho criado no escopo autenticado." });
    publishEditorialEvent("publication-created", publicationId);
    return { id: publicationId, slug };
  }),

  update: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedVersion: z.number().int().positive(), title: z.string().min(4).max(280).optional(), contentKind: z.enum(["História", "Cobertura", "Documentário", "Projeto", "Fotografia documental"]).optional(), subtitle: z.string().max(420).nullable().optional(), summary: z.string().max(2000).nullable().optional(), body: z.string().max(30000).nullable().optional(), teamId: z.number().int().positive().nullable().optional(), teamCredit: z.string().min(2).max(160).nullable().optional(), revisionNote: z.string().max(1000).optional(), sponsored: z.boolean().optional(), sponsorDisclosure: z.string().max(280).nullable().optional(), commercialRequestId: z.number().int().positive().nullable().optional(), photoLimit: z.number().int().min(0).max(MAX_PHOTOS).nullable().optional(), videoLimit: z.number().int().min(0).max(MAX_MINICLIPS).nullable().optional(), externalAlbumUrl: z.string().url().nullable().optional(), externalVideoUrl: z.string().url().nullable().optional(), taxonomyIds: z.array(z.number().int().positive()).optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const current = await db.select().from(publications).where(eq(publications.id, input.id)).limit(1);
    if (!current[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    await assertPublicationScope(db, ctx.user, current[0], "esta publicação");
    if (current[0].quarantinedAt) throw new TRPCError({ code: "FORBIDDEN", message: "Este conteúdo está em quarentena e não pode ser alterado." });
    const role = ctx.user.role as EditorialRole;
    if (!canEditPublication(role, current[0].status as ContentStatus)) throw new TRPCError({ code: "FORBIDDEN", message: "Seu papel não pode editar nesta etapa." });
    const { id, taxonomyIds, expectedVersion, teamCredit, revisionNote, ...values } = input;
    if (current[0].version !== expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de salvar." });
    const resolvedTeamId = teamCredit ? await resolveTeamId(db, values.teamId, teamCredit, ctx.user.id) : values.teamId;
    const updateValues: Partial<typeof publications.$inferInsert> = { ...values };
    let heldForEditorialAuthorization = false;
    if (updateValues.commercialRequestId !== undefined && updateValues.commercialRequestId !== null) {
      const authorization = await commercialAuthorizationByRequestId(db, updateValues.commercialRequestId);
      if (!canUseOnPortal(authorization) && current[0].isPublic) {
        updateValues.isPublic = false;
        updateValues.unpublishedAt = new Date();
        updateValues.unpublishedBy = ctx.user.id;
        heldForEditorialAuthorization = true;
      }
    }
    const updateResult = await db.update(publications).set({ ...updateValues, ...(resolvedTeamId ? { teamId: resolvedTeamId } : {}), editedBy: ctx.user.id, version: current[0].version + 1 }).where(and(eq(publications.id, id), eq(publications.version, expectedVersion)));
    if (!updateResult[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de salvar." });
    if (current[0].status === "Publicada") await db.insert(editorialActivities).values({ publicationId: id, actorId: ctx.user.id, fromStatus: "Publicada", toStatus: "Publicada", note: heldForEditorialAuthorization ? "Conteúdo retirado do portal até que a autorização editorial expressa seja registrada na contratação." : revisionNote?.trim() || "Revisão editorial após publicação." });
    if (taxonomyIds) {
      await db.delete(publicationTaxonomies).where(eq(publicationTaxonomies.publicationId, id));
      if (taxonomyIds.length) await db.insert(publicationTaxonomies).values(taxonomyIds.map(taxonomyId => ({ publicationId: id, taxonomyId })));
    }
    publishEditorialEvent("publication-updated", id);
    return { success: true, version: current[0].version + 1 };
  }),

  attachMedia: protectedProcedure.input(z.object({ publicationId: z.number().int().positive(), mediaId: z.number().int().positive(), caption: z.string().max(1000).optional(), biography: z.string().max(5000).optional(), location: z.string().max(280).optional(), capturedAt: z.date().optional(), asCover: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const publication = await db.select().from(publications).where(eq(publications.id, input.publicationId)).limit(1);
    if (!publication[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    await assertPublicationScope(db, ctx.user, publication[0], "esta publicação");
    if (!canEditPublication(ctx.user.role as EditorialRole, publication[0].status as ContentStatus)) throw new TRPCError({ code: "FORBIDDEN", message: "Seu papel não pode anexar mídias nesta etapa." });
    const media = await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.mediaId)).limit(1);
    if (!media[0] || !media[0].publicationAllowed || media[0].state !== "Ativo" || !["Aprovado", "Publicado"].includes(media[0].uploadStatus)) throw new TRPCError({ code: "BAD_REQUEST", message: "Esta mídia precisa estar ativa, autorizada e aprovada antes do vínculo editorial." });
    if (!canAccessOwnOperatorRecord(ctx.user.role, ctx.user.id, media[0].createdBy)) throw new TRPCError({ code: "FORBIDDEN", message: "Esta mídia pertence a outro admin." });
    if (publication[0].partnerId && media[0].partnerId !== publication[0].partnerId) throw new TRPCError({ code: "FORBIDDEN", message: "A mídia precisa pertencer ao mesmo Parceiro Ojú da publicação." });
    const existing = await db.select().from(publicationMedia).where(eq(publicationMedia.publicationId, input.publicationId));
    const existingIds = existing.map(link => link.mediaId);
    const existingMedia = existingIds.length ? await db.select().from(mediaAssets).where(inArray(mediaAssets.id, existingIds)) : [];
    const relationLinks = await db.select().from(publicationTaxonomies).where(eq(publicationTaxonomies.publicationId, input.publicationId));
    const relatedTaxonomies = relationLinks.length ? await db.select().from(taxonomies).where(inArray(taxonomies.id, relationLinks.map(link => link.taxonomyId))) : [];
    const hasEventRelation = relatedTaxonomies.some(taxonomy => taxonomy.dimension === "Evento");
    const alreadyLinked = existing.some(link => link.mediaId === input.mediaId);
    const withinLimit = canAttachWithinMediaLimit({ contentKind: publication[0].contentKind, mediaType: media[0].mediaType, photoLimit: publication[0].photoLimit, videoLimit: publication[0].videoLimit, attachedPhotoCount: existingMedia.filter(item => item.mediaType === "foto").length, attachedVideoCount: existingMedia.filter(item => item.mediaType === "vídeo").length, hasEventRelation });
    if (!alreadyLinked && !withinLimit) throw new TRPCError({ code: "BAD_REQUEST", message: publication[0].contentKind === "Fotografia documental" ? "Fotografia documental permite no máximo cinco imagens e não aceita vídeos." : `Este conteúdo atingiu o limite de ${media[0].mediaType === "foto" ? "fotografias" : "vídeos"} definido pela equipe editorial.` });
    if (publication[0].contentKind === "Fotografia documental" && !alreadyLinked && (!input.caption?.trim() || !input.location?.trim() || !input.capturedAt || !input.biography?.trim())) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe título, data, local e biografia viva para cada fotografia documental." });
    if (alreadyLinked) {
      if (input.asCover) {
        await db.update(publicationMedia).set({ displayOrder: sql`${publicationMedia.displayOrder} + 1` }).where(eq(publicationMedia.publicationId, input.publicationId));
        await db.update(publicationMedia).set({ displayOrder: 0 }).where(and(eq(publicationMedia.publicationId, input.publicationId), eq(publicationMedia.mediaId, input.mediaId)));
        publishEditorialEvent("media-attached", input.publicationId);
      }
      return { success: true, cover: Boolean(input.asCover) };
    }
    if (input.asCover) await db.update(publicationMedia).set({ displayOrder: sql`${publicationMedia.displayOrder} + 1` }).where(eq(publicationMedia.publicationId, input.publicationId));
    await db.insert(publicationMedia).values({ publicationId: input.publicationId, mediaId: input.mediaId, caption: input.caption, biography: input.biography, location: input.location, capturedAt: input.capturedAt, displayOrder: input.asCover ? 0 : existing.length + 1 });
    publishEditorialEvent("media-attached", input.publicationId);
    return { success: true, cover: Boolean(input.asCover) };
  }),

  detachMedia: protectedProcedure.input(z.object({ publicationId: z.number().int().positive(), mediaId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const publication = (await db.select().from(publications).where(eq(publications.id, input.publicationId)).limit(1))[0];
    if (!publication) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    await assertPublicationScope(db, ctx.user, publication, "esta publicação");
    if (!canEditPublication(ctx.user.role as EditorialRole, publication.status as ContentStatus)) throw new TRPCError({ code: "FORBIDDEN", message: "Seu papel não pode remover mídias nesta etapa." });
    const link = (await db.select().from(publicationMedia).where(and(eq(publicationMedia.publicationId, input.publicationId), eq(publicationMedia.mediaId, input.mediaId))).limit(1))[0];
    if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "A mídia não está vinculada a esta publicação." });
    await db.delete(publicationMedia).where(eq(publicationMedia.id, link.id));
    publishEditorialEvent("media-detached", input.publicationId);
    return { success: true };
  }),

  advanceStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedVersion: z.number().int().positive(), note: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const current = await db.select().from(publications).where(eq(publications.id, input.id)).limit(1);
    if (!current[0] || current[0].deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    await assertPublicationScope(db, ctx.user, current[0], "esta publicação");
    if (current[0].version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de alterar a etapa." });
    const previous = current[0].status as ContentStatus;
    const next = nextEditorialStatus(previous);
    const role = ctx.user.role as EditorialRole;
    if (!next || !canAdvanceStatus(role, previous)) throw new TRPCError({ code: "FORBIDDEN", message: "A transição solicitada não é permitida para seu papel." });
    const values: Partial<typeof publications.$inferInsert> = { status: next, version: current[0].version + 1 };
    if (next === "Aprovada") values.approvedBy = ctx.user.id;
    if (next === "Publicada") {
      await assertCommercialPublicationCanPublish(db, current[0]);
      values.publishedAt = new Date();
      values.isPublic = true;
      values.unpublishedAt = null;
      values.unpublishedBy = null;
      values.scheduledAt = null;
    }
    if (next === "Arquivada") {
      values.isPublic = false;
      values.unpublishedAt = new Date();
      values.unpublishedBy = ctx.user.id;
    }
    const changed = await db.update(publications).set(values).where(and(eq(publications.id, input.id), eq(publications.version, input.expectedVersion)));
    if (!changed[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de alterar a etapa." });
    await db.insert(editorialActivities).values({ publicationId: input.id, actorId: ctx.user.id, fromStatus: previous, toStatus: next, note: input.note });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current[0].partnerId, territoryId: (await publicationTerritoryIds(db, input.id))[0] ?? null, resourceType: "publication", resourceId: input.id, action: "publication-status-changed", previousState: { status: previous }, nextState: { status: next }, detail: input.note || `Etapa editorial: ${previous} → ${next}.` });
    publishEditorialEvent("status-changed", input.id);
    return { status: next };
  }),

  publishDirect: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedVersion: z.number().int().positive(), note: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const current = (await db.select().from(publications).where(eq(publications.id, input.id)).limit(1))[0];
    if (!current || current.deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    await assertPublicationScope(db, ctx.user, current, "esta publicação");
    const role = ctx.user.role as EditorialRole;
    if (!canPublishDirect(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Somente administradores podem publicar direto no portal." });
    if (current.version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de publicar." });
    if (current.status === "Publicada" && current.isPublic) return { status: "Publicada" as const };
    if (current.status === "Arquivada") throw new TRPCError({ code: "BAD_REQUEST", message: "Desarquive o conteúdo antes de publicar no portal." });
    await assertCommercialPublicationCanPublish(db, current);
    const previous = current.status as ContentStatus;
    const changed = await db.update(publications).set({
      status: "Publicada",
      isPublic: true,
      publishedAt: current.publishedAt ?? new Date(),
      unpublishedAt: null,
      unpublishedBy: null,
      scheduledAt: null,
      approvedBy: current.approvedBy ?? ctx.user.id,
      version: current.version + 1,
    }).where(and(eq(publications.id, input.id), eq(publications.version, input.expectedVersion)));
    if (!changed[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de publicar." });
    await db.insert(editorialActivities).values({ publicationId: input.id, actorId: ctx.user.id, fromStatus: previous, toStatus: "Publicada", note: input.note || "Publicação direta no portal pelo administrador." });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.partnerId, resourceType: "publication", resourceId: input.id, action: "publication-status-changed", previousState: { status: previous }, nextState: { status: "Publicada" }, detail: "Administrador publicou o conteúdo no portal sem percorrer todas as etapas intermediárias." });
    publishEditorialEvent("status-changed", input.id);
    return { status: "Publicada" as const };
  }),

  schedulePublish: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedVersion: z.number().int().positive(), scheduledAt: z.date() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const current = (await db.select().from(publications).where(eq(publications.id, input.id)).limit(1))[0];
    if (!current || current.deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    await assertPublicationScope(db, ctx.user, current, "o agendamento desta publicação");
    assertAdmin(ctx.user.role as EditorialRole);
    if (current.status !== "Aprovada") throw new TRPCError({ code: "BAD_REQUEST", message: "Somente conteúdo aprovado pode ser programado para o portal." });
    if (current.version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de agendar." });
    if (input.scheduledAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe uma data e hora futuras para a publicação automática." });
    await assertCommercialPublicationCanPublish(db, current);
    const changed = await db.update(publications).set({ scheduledAt: input.scheduledAt, version: current.version + 1 }).where(and(eq(publications.id, input.id), eq(publications.version, input.expectedVersion)));
    if (!changed[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de agendar." });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.partnerId, resourceType: "publication", resourceId: input.id, action: "publication-scheduled", nextState: { scheduledAt: input.scheduledAt.toISOString() }, detail: "Publicação aprovada programada. A automação só publica na data, sem alterar papéis." });
    return { scheduledAt: input.scheduledAt };
  }),

  setFeatured: protectedProcedure.input(z.object({ id: z.number().int().positive(), manualFeatured: z.boolean(), relevance: z.number().int().min(0).max(100), homePlacement: z.enum(["Nenhum", "Destaque principal", "Destaque secundário", "Recomendado"]), homeOrder: z.number().int().min(0).max(99), highlightExpiresAt: z.date().nullable().optional() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "A curadoria da Home nacional é exclusiva do Super Admin." });
    const db = await requireDb();
    const current = (await db.select().from(publications).where(eq(publications.id, input.id)).limit(1))[0];
    if (!current || current.deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    const highlightExpiresAt = input.homePlacement === "Nenhum" && !input.manualFeatured ? null : (input.highlightExpiresAt === undefined ? current.highlightExpiresAt : input.highlightExpiresAt);
    const updated = await db.update(publications).set({ manualFeatured: input.manualFeatured, relevance: input.relevance, homePlacement: input.homePlacement, homeOrder: input.homeOrder, highlightExpiresAt, version: current.version + 1 }).where(and(eq(publications.id, input.id), eq(publications.version, current.version)));
    if (!updated[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "A publicação foi atualizada por outra pessoa. Reabra-a antes de alterar a curadoria." });
    publishEditorialEvent("curation-updated", input.id);
    return { success: true };
  }),

  suggestHighlight: protectedProcedure.input(z.object({ publicationId: z.number().int().positive(), note: z.string().trim().min(3).max(2000).optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const publication = (await db.select().from(publications).where(eq(publications.id, input.publicationId)).limit(1))[0];
    if (!publication || publication.deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    await assertPublicationScope(db, ctx.user, publication, "a sugestão de destaque");
    if (!publication.partnerId && ctx.user.role !== "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "Somente conteúdo territorial de parceiro pode ser sugerido por administração regional." });
    const territoryIds = await publicationTerritoryIds(db, publication.id);
    const existing = (await db.select().from(highlightSuggestions).where(and(eq(highlightSuggestions.publicationId, publication.id), eq(highlightSuggestions.status, "Sugerida"))).limit(1))[0];
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma sugestão pendente para esta publicação." });
    const result = await db.insert(highlightSuggestions).values({ publicationId: publication.id, partnerId: publication.partnerId, territoryId: territoryIds[0] ?? null, note: input.note?.trim() || null, suggestedBy: ctx.user.id });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: publication.partnerId, territoryId: territoryIds[0] ?? null, resourceType: "highlight-suggestion", resourceId: Number(result[0].insertId), action: "highlight-suggested", nextState: { publicationId: publication.id }, detail: "Parceiro submeteu conteúdo para curadoria nacional; a Home não foi alterada automaticamente." });
    return { id: Number(result[0].insertId) };
  }),

  highlightSuggestions: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const rows = await db.select().from(highlightSuggestions).orderBy(desc(highlightSuggestions.createdAt));
    if (ctx.user.role === "administrador principal") return rows;
    const memberships = await activePartnerMemberships(db, ctx.user.id);
    const partnerIds = memberships.map(item => item.partnerId);
    return rows.filter(row => row.partnerId !== null && partnerIds.includes(row.partnerId));
  }),

  decideHighlightSuggestion: protectedProcedure.input(z.object({ id: z.number().int().positive(), approved: z.boolean(), decisionNote: z.string().trim().min(3).max(2000).optional(), homePlacement: z.enum(["Destaque principal", "Destaque secundário", "Recomendado"]).optional(), homeOrder: z.number().int().min(0).max(99).optional() })).mutation(async ({ ctx, input }) => {
    assertPrincipal(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const suggestion = (await db.select().from(highlightSuggestions).where(eq(highlightSuggestions.id, input.id)).limit(1))[0];
    if (!suggestion || suggestion.status !== "Sugerida") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta sugestão não está disponível para decisão." });
    const publication = (await db.select().from(publications).where(eq(publications.id, suggestion.publicationId)).limit(1))[0];
    if (!publication || publication.deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "A publicação sugerida não está disponível." });
    const now = new Date();
    if (input.approved) {
      const changed = await db.update(publications).set({ manualFeatured: true, homePlacement: input.homePlacement ?? "Recomendado", homeOrder: input.homeOrder ?? publication.homeOrder, version: publication.version + 1 }).where(and(eq(publications.id, publication.id), eq(publications.version, publication.version)));
      if (!changed[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "A publicação foi atualizada antes da decisão de curadoria." });
    }
    await db.update(highlightSuggestions).set({ status: input.approved ? "Aprovada" : "Recusada", decidedBy: ctx.user.id, decidedAt: now, decisionNote: input.decisionNote?.trim() || null }).where(eq(highlightSuggestions.id, suggestion.id));
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: suggestion.partnerId, territoryId: suggestion.territoryId, resourceType: "highlight-suggestion", resourceId: suggestion.id, action: input.approved ? "highlight-approved" : "highlight-rejected", previousState: { status: "Sugerida" }, nextState: { status: input.approved ? "Aprovada" : "Recusada" }, detail: "Decisão nacional de curadoria registrada pelo Super Admin." });
    publishEditorialEvent("curation-updated", publication.id);
    return { success: true };
  }),

  unpublish: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedVersion: z.number().int().positive(), note: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const role = ctx.user.role as EditorialRole;
    if (!["editor", "administrador", "administrador principal"].includes(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Seu papel não pode despublicar conteúdos." });
    const current = await db.select().from(publications).where(eq(publications.id, input.id)).limit(1);
    if (!current[0] || current[0].deletedAt || current[0].status !== "Publicada") throw new TRPCError({ code: "BAD_REQUEST", message: "Somente conteúdos publicados podem ser despublicados." });
    await assertPublicationScope(db, ctx.user, current[0], "esta publicação");
    if (current[0].version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de despublicar." });
    const changed = await db.update(publications).set({ isPublic: false, unpublishedAt: new Date(), unpublishedBy: ctx.user.id, version: current[0].version + 1 }).where(and(eq(publications.id, input.id), eq(publications.version, input.expectedVersion)));
    if (!changed[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de despublicar." });
    await db.insert(editorialActivities).values({ publicationId: input.id, actorId: ctx.user.id, fromStatus: "Publicada", toStatus: "Publicada", note: input.note || "Conteúdo despublicado." });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current[0].partnerId, territoryId: (await publicationTerritoryIds(db, input.id))[0] ?? null, resourceType: "publication", resourceId: input.id, action: "publication-unpublished", previousState: { isPublic: true }, nextState: { isPublic: false }, detail: input.note || "Conteúdo retirado do portal." });
    publishEditorialEvent("publication-unpublished", input.id);
    return { success: true };
  }),

  republish: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedVersion: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const role = ctx.user.role as EditorialRole;
    if (!["editor", "administrador", "administrador principal"].includes(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Seu papel não pode republicar conteúdos." });
    const current = await db.select().from(publications).where(eq(publications.id, input.id)).limit(1);
    if (!current[0] || current[0].deletedAt || current[0].status !== "Publicada") throw new TRPCError({ code: "BAD_REQUEST", message: "Este conteúdo não está pronto para republicação." });
    await assertPublicationScope(db, ctx.user, current[0], "esta publicação");
    if (current[0].version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de republicar." });
    await assertCommercialPublicationCanPublish(db, current[0]);
    const changed = await db.update(publications).set({ isPublic: true, unpublishedAt: null, unpublishedBy: null, version: current[0].version + 1 }).where(and(eq(publications.id, input.id), eq(publications.version, input.expectedVersion)));
    if (!changed[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de republicar." });
    await db.insert(editorialActivities).values({ publicationId: input.id, actorId: ctx.user.id, fromStatus: "Publicada", toStatus: "Publicada", note: "Conteúdo republicado." });
    publishEditorialEvent("publication-republished", input.id);
    return { success: true };
  }),

  archive: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedVersion: z.number().int().positive(), note: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
    const role = ctx.user.role as EditorialRole;
    assertAdmin(role);
    const db = await requireDb();
    const current = (await db.select().from(publications).where(eq(publications.id, input.id)).limit(1))[0];
    if (!current || current.deletedAt) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    await assertPublicationScope(db, ctx.user, current, "esta publicação");
    if (current.status === "Arquivada" && !current.isPublic) return { success: true };
    if (current.version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de arquivar." });
    const changed = await db.update(publications).set({ status: "Arquivada", isPublic: false, unpublishedAt: new Date(), unpublishedBy: ctx.user.id, version: current.version + 1 }).where(and(eq(publications.id, input.id), eq(publications.version, input.expectedVersion)));
    if (!changed[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de arquivar." });
    await db.insert(editorialActivities).values({ publicationId: input.id, actorId: ctx.user.id, fromStatus: current.status, toStatus: "Arquivada", note: input.note || "Conteúdo arquivado e retirado do portal." });
    publishEditorialEvent("publication-archived", input.id);
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedVersion: z.number().int().positive(), note: z.string().min(3).max(1000) })).mutation(async ({ ctx, input }) => {
    const role = ctx.user.role as EditorialRole;
    assertPrincipal(role);
    const db = await requireDb();
    const current = (await db.select().from(publications).where(eq(publications.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Publicação não encontrada." });
    if (current.quarantinedAt) throw new TRPCError({ code: "FORBIDDEN", message: "Conteúdo em quarentena não pode ir para a lixeira. Use o painel de denúncias." });
    if (current.deletedAt) return { success: true };
    if (current.version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de excluir." });
    const now = new Date();
    const changed = await db.update(publications).set({ status: "Arquivada", isPublic: false, unpublishedAt: now, unpublishedBy: ctx.user.id, deletedAt: now, deletedBy: ctx.user.id, deletionNote: input.note, version: current.version + 1 }).where(and(eq(publications.id, input.id), eq(publications.version, input.expectedVersion)));
    if (!changed[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de excluir." });
    await db.insert(editorialActivities).values({ publicationId: input.id, actorId: ctx.user.id, fromStatus: current.status, toStatus: "Arquivada", note: `Exclusão lógica pelo Super Admin: ${input.note}` });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.partnerId, territoryId: null, resourceType: "publication", resourceId: current.id, action: "publication-trashed", previousState: { status: current.status, version: current.version }, nextState: { status: "Arquivada", deletedAt: now.toISOString(), restoreUntil: editorialTrashDeadline(now).toISOString() }, detail: input.note });
    publishEditorialEvent("publication-deleted", input.id);
    return { success: true, restoreUntil: editorialTrashDeadline(now) };
  }),

  restore: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedVersion: z.number().int().positive(), note: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
    const role = ctx.user.role as EditorialRole;
    assertPrincipal(role);
    const db = await requireDb();
    const current = (await db.select().from(publications).where(eq(publications.id, input.id)).limit(1))[0];
    if (!current || !current.deletedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Esta publicação não está na lixeira editorial." });
    if (isEditorialTrashExpired(current.deletedAt)) throw new TRPCError({ code: "BAD_REQUEST", message: "O prazo de 24 horas para restauração expirou; esta publicação aguarda ou já recebeu expurgo definitivo." });
    if (current.version !== input.expectedVersion) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de restaurar." });
    const changed = await db.update(publications).set({ deletedAt: null, deletedBy: null, deletionNote: null, status: "Arquivada", isPublic: false, version: current.version + 1 }).where(and(eq(publications.id, input.id), eq(publications.version, input.expectedVersion)));
    if (!changed[0]?.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Esta publicação foi atualizada por outra pessoa. Reabra-a antes de restaurar." });
    await db.insert(editorialActivities).values({ publicationId: input.id, actorId: ctx.user.id, fromStatus: "Arquivada", toStatus: "Arquivada", note: input.note || "Publicação restaurada para o Acervo privado." });
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: current.partnerId, territoryId: null, resourceType: "publication", resourceId: current.id, action: "publication-restored-from-trash", previousState: { deletedAt: current.deletedAt.toISOString() }, nextState: { status: "Arquivada", deletedAt: null }, detail: input.note || "Restauração dentro da janela de 24 horas." });
    publishEditorialEvent("publication-restored", input.id);
    return { success: true };
  }),

  purgeTrash: protectedProcedure.input(z.object({ id: z.number().int().positive(), confirmation: z.string().trim().min(1).max(280) })).mutation(async ({ ctx, input }) => {
    assertPrincipal(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const current = (await db.select().from(publications).where(eq(publications.id, input.id)).limit(1))[0];
    if (!current || !current.deletedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Esta publicação não está disponível para expurgo definitivo." });
    if (!confirmPhrasesMatch(current.title, input.confirmation)) throw new TRPCError({ code: "BAD_REQUEST", message: "Digite o título da publicação para confirmar a exclusão definitiva. Maiúsculas e acentos não impedem a confirmação." });
    try {
      await permanentlyPurgePublication(db, current, ctx.user.id, "Expurgo definitivo confirmado manualmente pelo Super Admin na Lixeira Editorial.");
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível excluir definitivamente esta publicação." });
    }
    publishEditorialEvent("publication-permanently-purged", input.id);
    return { success: true };
  }),

  createTaxonomy: protectedProcedure.input(z.object({ dimension: z.enum(["Tipo de conteúdo", "Tema", "Localização", "Território", "Pessoa/organização", "Evento", "Data"]), name: z.string().min(2).max(180), description: z.string().max(1000).optional(), parentId: z.number().int().positive().optional(), latitude: z.string().regex(/^-?\d{1,2}(\.\d{1,7})?$/).optional(), longitude: z.string().regex(/^-?\d{1,3}(\.\d{1,7})?$/).optional(), mapVisibility: z.enum(["Não divulgar", "Aproximada", "Pública"]).optional() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const slug = `${slugify(input.name)}-${Date.now().toString(36)}`;
    const result = await db.insert(taxonomies).values({ ...input, slug, createdBy: ctx.user.id });
    publishEditorialEvent("taxonomy-updated");
    return { id: Number(result[0].insertId), slug };
  }),
  updateTaxonomy: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).max(180), description: z.string().max(1000).nullable().optional(), parentId: z.number().int().positive().nullable().optional(), latitude: z.string().regex(/^-?\d{1,2}(\.\d{1,7})?$/).nullable().optional(), longitude: z.string().regex(/^-?\d{1,3}(\.\d{1,7})?$/).nullable().optional(), mapVisibility: z.enum(["Não divulgar", "Aproximada", "Pública"]).optional() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const current = await db.select().from(taxonomies).where(eq(taxonomies.id, input.id)).limit(1);
    if (!current[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Taxonomia não encontrada." });
    assertTaxonomyWrite(ctx.user.role, ctx.user.id, current[0].createdBy);
    await db.update(taxonomies).set({ name: input.name, description: input.description, parentId: input.parentId, latitude: input.latitude, longitude: input.longitude, mapVisibility: input.mapVisibility }).where(eq(taxonomies.id, input.id));
    publishEditorialEvent("taxonomy-updated");
    return { success: true };
  }),
  removeTaxonomy: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const current = await db.select().from(taxonomies).where(eq(taxonomies.id, input.id)).limit(1);
    if (!current[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Taxonomia não encontrada." });
    assertTaxonomyWrite(ctx.user.role, ctx.user.id, current[0].createdBy);
    await db.delete(publicationTaxonomies).where(eq(publicationTaxonomies.taxonomyId, input.id));
    await db.update(taxonomies).set({ parentId: null }).where(eq(taxonomies.parentId, input.id));
    await db.delete(taxonomies).where(eq(taxonomies.id, input.id));
    publishEditorialEvent("taxonomy-updated");
    return { success: true };
  }),
  taxonomyRelations: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const links = await db.select().from(publicationTaxonomies).where(eq(publicationTaxonomies.taxonomyId, input.id));
    const ids = links.map(link => link.publicationId);
    const related = ids.length ? await db.select().from(publications).where(inArray(publications.id, ids)) : [];
    const scoped = await scopedPublicationIds(db, ctx.user);
    if (scoped === "all") return related;
    return related.filter(item => scoped.includes(item.id));
  }),
  taxonomyMedia: protectedProcedure.input(z.object({ taxonomyId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await requireDb(); const links = await db.select().from(taxonomyMedia).where(eq(taxonomyMedia.taxonomyId, input.taxonomyId)).orderBy(desc(taxonomyMedia.isPrimary), taxonomyMedia.displayOrder); const ids = links.map(link => link.mediaId); const assets = ids.length ? await db.select().from(mediaAssets).where(inArray(mediaAssets.id, ids)) : []; return links.map(link => ({ ...assets.find(asset => asset.id === link.mediaId)!, linkId: link.id, isPrimary: link.isPrimary, displayOrder: link.displayOrder })).filter(Boolean);
  }),
  attachTaxonomyMedia: protectedProcedure.input(z.object({ taxonomyId: z.number().int().positive(), mediaId: z.number().int().positive(), isPrimary: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const taxonomy = await db.select().from(taxonomies).where(eq(taxonomies.id, input.taxonomyId)).limit(1);
    if (!taxonomy[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Taxonomia não encontrada." });
    assertTaxonomyWrite(ctx.user.role, ctx.user.id, taxonomy[0].createdBy);
    const media = await db.select().from(mediaAssets).where(eq(mediaAssets.id, input.mediaId)).limit(1);
    if (!media[0] || !media[0].publicationAllowed || media[0].state !== "Ativo") throw new TRPCError({ code: "BAD_REQUEST", message: "A mídia precisa estar ativa e autorizada no Acervo." });
    if (!canAccessOwnOperatorRecord(ctx.user.role, ctx.user.id, media[0].createdBy)) throw new TRPCError({ code: "FORBIDDEN", message: "Esta mídia pertence a outro admin." });
    if (input.isPrimary) await db.update(taxonomyMedia).set({ isPrimary: false }).where(eq(taxonomyMedia.taxonomyId, input.taxonomyId));
    const existing = await db.select().from(taxonomyMedia).where(and(eq(taxonomyMedia.taxonomyId, input.taxonomyId), eq(taxonomyMedia.mediaId, input.mediaId))).limit(1);
    if (existing[0]) {
      await db.update(taxonomyMedia).set({ isPrimary: input.isPrimary ?? existing[0].isPrimary }).where(eq(taxonomyMedia.id, existing[0].id));
    } else {
      await db.insert(taxonomyMedia).values({ taxonomyId: input.taxonomyId, mediaId: input.mediaId, isPrimary: input.isPrimary ?? false });
    }
    publishEditorialEvent("taxonomy-updated");
    return { success: true };
  }),
  removeTaxonomyMedia: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const link = (await db.select().from(taxonomyMedia).where(eq(taxonomyMedia.id, input.id)).limit(1))[0];
    if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Vínculo de mídia não encontrado." });
    const taxonomy = (await db.select().from(taxonomies).where(eq(taxonomies.id, link.taxonomyId)).limit(1))[0];
    if (!taxonomy) throw new TRPCError({ code: "NOT_FOUND", message: "Taxonomia não encontrada." });
    assertTaxonomyWrite(ctx.user.role, ctx.user.id, taxonomy.createdBy);
    await db.delete(taxonomyMedia).where(eq(taxonomyMedia.id, input.id));
    publishEditorialEvent("taxonomy-updated");
    return { success: true };
  }),

  publicPhotographers: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(48).default(24), offset: z.number().int().min(0).default(0) }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const limit = input?.limit ?? 24;
    const offset = input?.offset ?? 0;
    const whereClause = and(eq(networkExecutors.status, "Ativo"), eq(networkExecutors.publicVisible, true), isNotNull(networkExecutors.publicSlug));
    const totalRow = await db.select({ value: count() }).from(networkExecutors).where(whereClause);
    const total = Number(totalRow[0]?.value || 0);
    const items = await db.select({ id: networkExecutors.id, displayName: networkExecutors.displayName, slug: networkExecutors.publicSlug, profileNote: networkExecutors.profileNote, specialty: networkExecutors.specialty, territoryId: networkExecutors.territoryId, instagramHandle: networkExecutors.instagramHandle }).from(networkExecutors).where(whereClause).orderBy(networkExecutors.displayName).limit(limit).offset(offset);
    return { items, total, hasMore: offset + items.length < total };
  }),

  photographerBySlug: publicProcedure.input(z.object({ slug: z.string().min(1), limit: z.number().int().min(1).max(24).default(12), offset: z.number().int().min(0).default(0) })).query(async ({ input }) => {
    const db = await requireDb();
    const photographer = (await db.select({ id: networkExecutors.id, displayName: networkExecutors.displayName, slug: networkExecutors.publicSlug, profileNote: networkExecutors.profileNote, specialty: networkExecutors.specialty, territoryId: networkExecutors.territoryId, instagramHandle: networkExecutors.instagramHandle }).from(networkExecutors).where(and(eq(networkExecutors.publicSlug, input.slug), eq(networkExecutors.publicVisible, true), eq(networkExecutors.status, "Ativo"))).limit(1))[0];
    if (!photographer) return null;
    const credited = await db.select({ publicationId: publicationMedia.publicationId }).from(publicationMedia).innerJoin(mediaAssets, eq(publicationMedia.mediaId, mediaAssets.id)).where(and(eq(mediaAssets.photographerId, photographer.id), isNull(mediaAssets.deletedAt)));
    const publicationIds = Array.from(new Set(credited.map(item => item.publicationId)));
    if (!publicationIds.length) return { photographer, items: [], total: 0, hasMore: false };
    const whereClause = and(inArray(publications.id, publicationIds), eq(publications.status, "Publicada"), eq(publications.isPublic, true), isNull(publications.deletedAt), isNull(publications.quarantinedAt));
    const totalRow = await db.select({ value: count() }).from(publications).where(whereClause);
    const total = Number(totalRow[0]?.value || 0);
    const records = await db.select().from(publications).where(whereClause).orderBy(desc(publications.publishedAt)).limit(input.limit).offset(input.offset);
    const items = (await portalAuthorizedPublications(db, records)).map(({ publication, authorization }) => toPortalPublication(publication, authorization));
    return { photographer, items, total, hasMore: input.offset + records.length < total };
  }),

  teams: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const rows = await db.select().from(teams).orderBy(teams.name);
    const usageRows = await db.select({ teamId: publications.teamId }).from(publications).where(isNotNull(publications.teamId));
    const used = new Map<number, number>();
    for (const row of usageRows) {
      if (!row.teamId) continue;
      used.set(row.teamId, (used.get(row.teamId) || 0) + 1);
    }
    const principal = ctx.user.role === "administrador principal";
    const myTeamIds = principal
      ? new Set<number>()
      : new Set((await db.select({ teamId: publications.teamId }).from(publications).where(and(eq(publications.createdBy, ctx.user.id), isNotNull(publications.teamId)))).map(row => row.teamId).filter((id): id is number => typeof id === "number"));
    const visible = rows.filter(row => {
      if (principal) return true;
      if (row.archivedAt) return false;
      return canAccessOwnOperatorRecord(ctx.user.role, ctx.user.id, row.createdBy) || myTeamIds.has(row.id);
    });
    return visible.map(row => ({ ...row, usageCount: used.get(row.id) || 0 }));
  }),

  createTeam: protectedProcedure.input(z.object({ name: z.string().min(2).max(160), description: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const catalog = await db.select().from(teams);
    const reusable = pickReusableTeam(catalog, input.name);
    if (reusable) return { id: reusable.id, reused: true };
    const slug = `${slugify(input.name)}-${Date.now().toString(36)}`;
    const result = await db.insert(teams).values({ name: input.name.trim(), description: input.description, slug, createdBy: ctx.user.id });
    return { id: Number(result[0].insertId), reused: false };
  }),

  archiveTeam: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const current = (await db.select().from(teams).where(eq(teams.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Equipe não encontrada." });
    if (ctx.user.role !== "administrador principal" && !canAccessOwnOperatorRecord(ctx.user.role, ctx.user.id, current.createdBy)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Esta equipe é de outro admin." });
    }
    await db.update(teams).set({ archivedAt: new Date(), archivedBy: ctx.user.id }).where(eq(teams.id, input.id));
    await recordAuditEvent(db, { actorId: ctx.user.id, resourceType: "team", resourceId: input.id, action: "team-archived", previousState: { name: current.name }, detail: "Equipe arquivada. Matérias que já usam este crédito preservam o nome." });
    return { success: true };
  }),

  restoreTeam: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    assertPrincipal(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const current = (await db.select().from(teams).where(eq(teams.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Equipe não encontrada." });
    await db.update(teams).set({ archivedAt: null, archivedBy: null }).where(eq(teams.id, input.id));
    await recordAuditEvent(db, { actorId: ctx.user.id, resourceType: "team", resourceId: input.id, action: "team-restored", detail: "Equipe restaurada para novos créditos." });
    return { success: true };
  }),

  removeTeam: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const current = (await db.select().from(teams).where(eq(teams.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Equipe não encontrada." });
    if (ctx.user.role !== "administrador principal" && !canAccessOwnOperatorRecord(ctx.user.role, ctx.user.id, current.createdBy)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Esta equipe é de outro admin." });
    }
    const used = await db.select({ value: count() }).from(publications).where(eq(publications.teamId, input.id));
    if (Number(used[0]?.value || 0) > 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Esta equipe ainda credita matérias. Arquive em vez de excluir, para o histórico não sumir." });
    }
    await db.delete(teams).where(eq(teams.id, input.id));
    await recordAuditEvent(db, { actorId: ctx.user.id, resourceType: "team", resourceId: input.id, action: "team-removed", previousState: { name: current.name }, detail: "Equipe sem matérias excluída do catálogo de créditos." });
    return { success: true };
  }),

  mergeDuplicateTeams: protectedProcedure.mutation(async ({ ctx }) => {
    assertPrincipal(ctx.user.role as EditorialRole);
    const db = await requireDb();
    const catalog = await db.select().from(teams);
    const groups = groupDuplicateTeamIds(catalog);
    let merged = 0;
    for (const group of groups) {
      if (!group.absorbIds.length) continue;
      await db.update(publications).set({ teamId: group.keepId }).where(inArray(publications.teamId, group.absorbIds));
      await db.update(teams).set({ archivedAt: new Date(), archivedBy: ctx.user.id }).where(inArray(teams.id, group.absorbIds));
      merged += group.absorbIds.length;
    }
    await recordAuditEvent(db, { actorId: ctx.user.id, resourceType: "team", action: "team-merged", nextState: { groups: groups.length, archived: merged }, detail: "Duplicatas de crédito unificadas. As matérias passaram a apontar para a equipe mais antiga de cada nome." });
    return { groups: groups.length, archived: merged };
  }),
});

