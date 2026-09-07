import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import {
  institutionVisibilitySubscriptions,
  institutions,
  mediaAssets,
  networkProductions,
  partners,
  professionalProfiles,
  professionalProfileSpecialties,
  publicationMedia,
  publications,
  taxonomies,
  commercialEditorialAuthorizations,
} from "../drizzle/schema";
import { canUseOnPortal } from "./commercialEditorialAuthorization";
import { bondLabel, decodeSpecialties } from "@shared/professionalSpecialties";
import { PRODUCTION_MINICLIP_CAP, PRODUCTION_MINICLIP_SECONDS, PRODUCTION_PHOTO_CAP, productionMediaWithinLimit } from "@shared/networkProductions";
import {
  decideCommunityHouseDirectory,
  decidePartnerDirectory,
  decideProfessionalDirectory,
  directoryTerritoryFilter,
  publicationEligibleForPortal,
} from "@shared/territorialVisibility";
import { slugifyEditorial } from "./editorialScale";
import { isMissingProfessionalNetworkSchema } from "./professionalNetwork";
import { assertPartnerScope, recordAuditEvent } from "./partnerScope";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Actor = { id: number; role: string };

function requireDirectoryAdmin(role: string) {
  if (!["administrador", "administrador principal"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente administração autorizada publica presença na Rede." });
  }
}

async function uniqueProfileSlug(db: Db, name: string) {
  const base = slugifyEditorial(name) || "profissional";
  let slug = base;
  let suffix = 1;
  while ((await db.select({ id: professionalProfiles.id }).from(professionalProfiles).where(eq(professionalProfiles.publicSlug, slug)).limit(1))[0]) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

function publicProfileRow(profile: typeof professionalProfiles.$inferSelect, specialtyIds: string[], territoryName: string | null) {
  return {
    kind: "profissional" as const,
    id: profile.id,
    slug: profile.publicSlug,
    displayName: profile.displayName,
    specialties: decodeSpecialties(specialtyIds.join(" · ")),
    bond: bondLabel(profile.networkBond),
    territoryId: profile.territoryId,
    territoryName,
    bio: profile.publicBio,
    contact: profile.publicContact,
    mediaOutletName: profile.hasOwnMedia ? profile.mediaOutletName : null,
    href: `/rede/profissionais/${profile.publicSlug}`,
  };
}

export async function listPublicNetworkDirectory(db: Db, input: {
  q?: string | null;
  territoryId?: number | null;
  specialtyId?: string | null;
  kind?: "profissional" | "casa" | "projeto" | "parceiro" | null;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(input.limit ?? 24, 48);
  const offset = input.offset ?? 0;
  const q = input.q?.trim().toLocaleLowerCase("pt-BR") || "";
  try {
    const items: Array<{ kind: string; id: number; slug: string | null; displayName: string; href: string; summary: string | null; territoryName: string | null; specialties?: ReturnType<typeof decodeSpecialties> }> = [];
    if (!input.kind || input.kind === "profissional") {
      const profiles = await db.select().from(professionalProfiles).where(and(eq(professionalProfiles.status, "Ativo"), eq(professionalProfiles.publicVisible, true)));
      const ids = profiles.map(item => item.id);
      const specialties = ids.length ? await db.select().from(professionalProfileSpecialties).where(inArray(professionalProfileSpecialties.profileId, ids)) : [];
      const territoryIds = Array.from(new Set(profiles.map(item => item.territoryId).filter((id): id is number => Boolean(id))));
      const territories = territoryIds.length ? await db.select({ id: taxonomies.id, name: taxonomies.name }).from(taxonomies).where(inArray(taxonomies.id, territoryIds)) : [];
      for (const profile of profiles) {
        if (!decideProfessionalDirectory({ status: profile.status, publicVisible: profile.publicVisible }).allowed) continue;
        const specialtyIds = specialties.filter(item => item.profileId === profile.id).map(item => item.specialtyId);
        if (input.specialtyId && !specialtyIds.includes(input.specialtyId)) continue;
        if (!directoryTerritoryFilter(profile.territoryId, input.territoryId)) continue;
        const haystack = [profile.displayName, profile.publicBio, specialtyIds.join(" ")].join(" ").toLocaleLowerCase("pt-BR");
        if (q && !haystack.includes(q)) continue;
        const territoryName = territories.find(item => item.id === profile.territoryId)?.name ?? null;
        const row = publicProfileRow(profile, specialtyIds, territoryName);
        items.push({ kind: row.kind, id: row.id, slug: row.slug, displayName: row.displayName, href: row.href, summary: row.bio, territoryName, specialties: row.specialties });
      }
    }
    if (!input.kind || input.kind === "casa") {
      const now = new Date();
      const houses = await db.select().from(institutions).where(and(eq(institutions.status, "Publicada"), eq(institutions.consentStatus, "Autorizado"), isNull(institutions.deletedAt)));
      const subscriptions = await db.select().from(institutionVisibilitySubscriptions).where(and(eq(institutionVisibilitySubscriptions.status, "Ativa"), lte(institutionVisibilitySubscriptions.startsAt, now), gt(institutionVisibilitySubscriptions.expiresAt, now)));
      const visibleServiceIds = new Set(subscriptions.map(item => item.institutionId));
      for (const house of houses) {
        if (!decideCommunityHouseDirectory({
          status: house.status,
          consentStatus: house.consentStatus,
          deletedAt: house.deletedAt,
          directoryScope: house.directoryScope,
          hasActiveInstitutionalVisibilityPlan: visibleServiceIds.has(house.id),
        }).allowed) continue;
        if (!directoryTerritoryFilter(house.territoryId, input.territoryId)) continue;
        const haystack = [house.name, house.description, house.institutionType].join(" ").toLocaleLowerCase("pt-BR");
        if (q && !haystack.includes(q)) continue;
        items.push({ kind: "casa", id: house.id, slug: house.slug, displayName: house.name, href: `/rede/casas/${house.slug}`, summary: house.description, territoryName: null });
      }
    }
    if (!input.kind || input.kind === "projeto") {
      const projects = await db.select({
        id: publications.id,
        title: publications.title,
        slug: publications.slug,
        summary: publications.summary,
        status: publications.status,
        isPublic: publications.isPublic,
        quarantinedAt: publications.quarantinedAt,
        deletedAt: publications.deletedAt,
        commercialRequestId: publications.commercialRequestId,
      }).from(publications).where(and(eq(publications.contentKind, "Projeto"), eq(publications.status, "Publicada"), eq(publications.isPublic, true), isNull(publications.deletedAt)));
      const requestIds = Array.from(new Set(projects.flatMap(item => item.commercialRequestId ? [item.commercialRequestId] : [])));
      const authorizations = requestIds.length
        ? await db.select().from(commercialEditorialAuthorizations).where(inArray(commercialEditorialAuthorizations.requestId, requestIds))
        : [];
      const authorizationByRequest = new Map(authorizations.map(item => [item.requestId, item]));
      for (const project of projects) {
        const authorization = project.commercialRequestId ? authorizationByRequest.get(project.commercialRequestId) ?? null : null;
        if (!publicationEligibleForPortal({
          status: project.status,
          isPublic: project.isPublic,
          quarantinedAt: project.quarantinedAt,
          deletedAt: project.deletedAt,
          commercialRequestId: project.commercialRequestId,
          commerciallyAuthorized: project.commercialRequestId == null || canUseOnPortal(authorization),
        })) continue;
        const haystack = [project.title, project.summary].join(" ").toLocaleLowerCase("pt-BR");
        if (q && !haystack.includes(q)) continue;
        items.push({ kind: "projeto", id: project.id, slug: project.slug, displayName: project.title, href: `/projetos/${project.slug}`, summary: project.summary, territoryName: null });
      }
    }
    if (!input.kind || input.kind === "parceiro") {
      const rows = await db.select({ id: partners.id, displayName: partners.displayName, slug: partners.slug, description: partners.description }).from(partners).where(and(eq(partners.publicVisibility, true), eq(partners.status, "Ativo")));
      for (const partner of rows) {
        if (!decidePartnerDirectory({ status: "Ativo", publicVisibility: true }).allowed) continue;
        const haystack = [partner.displayName, partner.description].join(" ").toLocaleLowerCase("pt-BR");
        if (q && !haystack.includes(q)) continue;
        items.push({ kind: "parceiro", id: partner.id, slug: partner.slug, displayName: partner.displayName, href: `/rede/parceiros/${partner.slug}`, summary: partner.description, territoryName: null });
      }
    }
    items.sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"));
    const page = items.slice(offset, offset + limit);
    return { items: page, total: items.length, hasMore: offset + page.length < items.length };
  } catch (error) {
    if (isMissingProfessionalNetworkSchema(error)) return { items: [], total: 0, hasMore: false };
    throw error;
  }
}

export async function getPublicProfessionalBySlug(db: Db, slug: string) {
  try {
    const profile = (await db.select().from(professionalProfiles).where(and(eq(professionalProfiles.publicSlug, slug), eq(professionalProfiles.publicVisible, true), eq(professionalProfiles.status, "Ativo"))).limit(1))[0];
    if (!profile || !decideProfessionalDirectory({ status: profile.status, publicVisible: profile.publicVisible }).allowed) return null;
    const specialtyRows = await db.select().from(professionalProfileSpecialties).where(eq(professionalProfileSpecialties.profileId, profile.id));
    const territory = profile.territoryId
      ? (await db.select({ name: taxonomies.name }).from(taxonomies).where(eq(taxonomies.id, profile.territoryId)).limit(1))[0]
      : null;
    const productions = await db.select({
      id: networkProductions.id,
      publicationId: networkProductions.publicationId,
      title: networkProductions.title,
      territoryId: networkProductions.territoryId,
      editorialReady: networkProductions.editorialReady,
      status: networkProductions.status,
    }).from(networkProductions).where(eq(networkProductions.professionalProfileId, profile.id));
    const publicProductionIds = productions.filter(item => item.editorialReady && item.publicationId && item.status === "Concluída").map(item => item.publicationId!) ;
    const stories = publicProductionIds.length
      ? await db.select({ id: publications.id, title: publications.title, slug: publications.slug, summary: publications.summary, contentKind: publications.contentKind }).from(publications).where(and(inArray(publications.id, publicProductionIds), eq(publications.status, "Publicada"), eq(publications.isPublic, true), isNull(publications.deletedAt)))
      : [];
    const mediaLinks = stories.length
      ? await db.select({ publicationId: publicationMedia.publicationId, mediaId: publicationMedia.mediaId }).from(publicationMedia).where(inArray(publicationMedia.publicationId, stories.map(item => item.id)))
      : [];
    const mediaIds = mediaLinks.map(item => item.mediaId);
    const assets = mediaIds.length
      ? await db.select({ id: mediaAssets.id, mediaType: mediaAssets.mediaType, durationSeconds: mediaAssets.durationSeconds, credit: mediaAssets.credit, filename: mediaAssets.filename, publicationAllowed: mediaAssets.publicationAllowed, authorization: mediaAssets.authorization, state: mediaAssets.state, deletedAt: mediaAssets.deletedAt }).from(mediaAssets).where(inArray(mediaAssets.id, mediaIds))
      : [];
    const window: typeof assets = [];
    let photos = 0;
    let videos = 0;
    for (const asset of assets) {
      if (asset.deletedAt || asset.state !== "Ativo" || !asset.publicationAllowed || asset.authorization === "Pendente") continue;
      const limit = productionMediaWithinLimit({
        mediaType: asset.mediaType,
        durationSeconds: asset.durationSeconds,
        attachedPhotoCount: photos,
        attachedVideoCount: videos,
      });
      if (!limit.ok) continue;
      window.push(asset);
      if (asset.mediaType === "foto") photos += 1;
      if (asset.mediaType === "vídeo") videos += 1;
      if (photos >= PRODUCTION_PHOTO_CAP && videos >= PRODUCTION_MINICLIP_CAP) break;
    }
    return {
      profile: publicProfileRow(profile, specialtyRows.map(item => item.specialtyId), territory?.name ?? null),
      stories: stories.map(item => ({ id: item.id, title: item.title, slug: item.slug, summary: item.summary, contentKind: item.contentKind, href: `/historias/${item.slug}` })),
      media: window.map(item => ({ id: item.id, mediaType: item.mediaType, credit: item.credit, durationSeconds: item.durationSeconds })),
      window: { photos: PRODUCTION_PHOTO_CAP, miniclips: PRODUCTION_MINICLIP_CAP, seconds: PRODUCTION_MINICLIP_SECONDS },
      canonical: `/rede/profissionais/${profile.publicSlug}`,
    };
  } catch (error) {
    if (isMissingProfessionalNetworkSchema(error)) return null;
    throw error;
  }
}

export async function getPublicPartnerBySlug(db: Db, slug: string) {
  const partner = (await db.select({
    id: partners.id,
    displayName: partners.displayName,
    slug: partners.slug,
    description: partners.description,
    instagramHandle: partners.instagramHandle,
  }).from(partners).where(and(eq(partners.slug, slug), eq(partners.publicVisibility, true), eq(partners.status, "Ativo"))).limit(1))[0];
  if (!partner || !decidePartnerDirectory({ status: "Ativo", publicVisibility: true }).allowed) return null;
  return {
    partner: {
      kind: "parceiro" as const,
      id: partner.id,
      slug: partner.slug,
      displayName: partner.displayName,
      description: partner.description,
      instagramHandle: partner.instagramHandle,
      href: `/rede/parceiros/${partner.slug}`,
    },
    canonical: `/rede/parceiros/${partner.slug}`,
  };
}

export async function listDirectoryProfilesForAdmin(db: Db, actor: Actor) {
  requireDirectoryAdmin(actor.role);
  try {
    const rows = await db.select().from(professionalProfiles);
    const visible = [];
    for (const row of rows) {
      if (actor.role === "administrador principal") {
        visible.push(row);
        continue;
      }
      try {
        await assertPartnerScope({ db, actor, partnerId: row.partnerId, territoryIds: row.territoryId ? [row.territoryId] : [], resourceLabel: "este perfil da Rede", requirePartner: Boolean(row.partnerId) });
        visible.push(row);
      } catch {
        /* fora do território */
      }
    }
    return visible.map(row => ({
      id: row.id,
      displayName: row.displayName,
      status: row.status,
      publicVisible: row.publicVisible,
      publicSlug: row.publicSlug,
      territoryId: row.territoryId,
      networkBond: row.networkBond,
    }));
  } catch (error) {
    if (isMissingProfessionalNetworkSchema(error)) return [];
    throw error;
  }
}

export async function setDirectoryProfileVisible(db: Db, actor: Actor, input: { profileId: number; publicVisible: boolean; publicBio?: string | null; publicContact?: string | null }) {
  requireDirectoryAdmin(actor.role);
  const profile = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.id, input.profileId)).limit(1))[0];
  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Perfil profissional não encontrado." });
  try {
    await assertPartnerScope({ db, actor, partnerId: profile.partnerId, territoryIds: profile.territoryId ? [profile.territoryId] : [], resourceLabel: "este perfil da Rede", requirePartner: actor.role !== "administrador principal" && Boolean(profile.partnerId) });
  } catch (error) {
    throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Fora do território." });
  }
  if (input.publicVisible && profile.status !== "Ativo") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Perfil suspenso ou em rascunho não entra no diretório público." });
  }
  const slug = profile.publicSlug || (input.publicVisible ? await uniqueProfileSlug(db, profile.displayName) : profile.publicSlug);
  await db.update(professionalProfiles).set({
    publicVisible: input.publicVisible,
    publicSlug: slug,
    publicBio: input.publicBio === undefined ? profile.publicBio : (input.publicBio?.trim() || null),
    publicContact: input.publicContact === undefined ? profile.publicContact : (input.publicContact?.trim() || null),
  }).where(eq(professionalProfiles.id, profile.id));
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: profile.partnerId,
    territoryId: profile.territoryId,
    resourceType: "network-directory-profile",
    resourceId: profile.id,
    action: input.publicVisible === profile.publicVisible ? "directory_profile_updated" : input.publicVisible ? "directory_profile_published" : "directory_profile_hidden",
    previousState: { publicVisible: profile.publicVisible },
    nextState: { publicVisible: input.publicVisible, slug },
    detail: "Presença pública da Rede. Pagamento não controla visibilidade. Especialidade não concede permissão.",
  });
  return { success: true as const, slug };
}
