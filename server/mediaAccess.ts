import { and, eq, isNull, or } from "drizzle-orm";
import {
  commercialMiniclips,
  communityEvents,
  institutions,
  mediaAssets,
  oralMemories,
  partners,
  publicationMedia,
  publications,
  uploadSessions,
} from "../drizzle/schema";
import type { getDb } from "./db";
import { assertPartnerScope } from "./partnerScope";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export function isUnsafeStorageKey(relKey: string) {
  const key = relKey.replace(/^\/+/, "").replace(/\\/g, "/");
  return !key || key.includes("..") || key.startsWith("/") || key.includes("\0");
}

export function normalizeStorageKey(relKey: string) {
  return relKey.replace(/^\/+/, "").replace(/\\/g, "/");
}

export function toPublicPortalMedia(media: {
  id: number;
  mediaType: string;
  assetUrl: string;
  credit: string;
  origin: string;
  filename?: string | null;
  durationSeconds?: number | null;
  photographerId?: number | null;
}) {
  return {
    id: media.id,
    mediaType: media.mediaType,
    assetUrl: media.assetUrl,
    credit: media.credit,
    origin: media.origin,
    filename: media.filename ?? null,
    durationSeconds: media.durationSeconds ?? null,
    photographerId: media.photographerId ?? null,
  };
}

export async function canPubliclyReleaseMedia(
  db: Db,
  media: { id: number; publicationAllowed: boolean; state: string; deletedAt: Date | null; backgroundEligible: boolean },
) {
  if (media.deletedAt) return false;
  if (!media.publicationAllowed || media.state !== "Ativo") return false;
  if (media.backgroundEligible) return true;

  const [linkedPublication, homeClip, partnerBrand, institutionCover, eventCover, oral] = await Promise.all([
    db.select({ id: publications.id }).from(publicationMedia).innerJoin(publications, eq(publicationMedia.publicationId, publications.id)).where(and(eq(publicationMedia.mediaId, media.id), eq(publications.status, "Publicada"), eq(publications.isPublic, true), isNull(publications.deletedAt))).limit(1),
    db.select({ id: commercialMiniclips.id }).from(commercialMiniclips).where(and(eq(commercialMiniclips.mediaId, media.id), eq(commercialMiniclips.status, "Ativo"), eq(commercialMiniclips.homeFeatured, true), eq(commercialMiniclips.authorizedForHome, true))).limit(1),
    db.select({ id: partners.id }).from(partners).where(and(eq(partners.status, "Ativo"), eq(partners.publicVisibility, true), or(eq(partners.logoMediaId, media.id), eq(partners.profileMediaId, media.id)))).limit(1),
    db.select({ id: institutions.id }).from(institutions).where(and(eq(institutions.primaryMediaId, media.id), eq(institutions.status, "Publicada"), isNull(institutions.deletedAt))).limit(1),
    db.select({ id: communityEvents.id }).from(communityEvents).where(and(eq(communityEvents.coverMediaId, media.id), eq(communityEvents.status, "Publicada"), isNull(communityEvents.deletedAt))).limit(1),
    db.select({ id: oralMemories.id }).from(oralMemories).where(and(eq(oralMemories.videoMediaId, media.id), eq(oralMemories.status, "Publicada"), eq(oralMemories.accessLevel, "Público"), isNull(oralMemories.deletedAt))).limit(1),
  ]);

  return Boolean(linkedPublication[0] || homeClip[0] || partnerBrand[0] || institutionCover[0] || eventCover[0] || oral[0]);
}

export async function authorizeStorageKeyAccess(db: Db, relKey: string, actor: { id: number; role: string } | null): Promise<"allow" | "deny"> {
  const key = normalizeStorageKey(relKey);
  if (isUnsafeStorageKey(key)) return "deny";

  const media = (await db.select().from(mediaAssets).where(eq(mediaAssets.storageKey, key)).limit(1))[0];
  if (media) {
    if (await canPubliclyReleaseMedia(db, media)) return "allow";
    if (!actor) return "deny";
    if (actor.role === "administrador principal") return "allow";
    if (media.createdBy !== actor.id) return "deny";
    if (!media.partnerId) return "allow";
    try {
      await assertPartnerScope({ db, actor, partnerId: media.partnerId, territoryIds: media.territoryId ? [media.territoryId] : [], resourceLabel: "esta mídia", requirePartner: true });
      return "allow";
    } catch {
      return "deny";
    }
  }

  const session = (await db.select().from(uploadSessions).where(eq(uploadSessions.storageKey, key)).limit(1))[0];
  if (!session) return "deny";
  if (!actor) return "deny";
  if (actor.role === "administrador principal") return "allow";
  return session.userId === actor.id ? "allow" : "deny";
}
