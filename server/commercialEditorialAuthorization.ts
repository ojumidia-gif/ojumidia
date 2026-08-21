import type { commercialEditorialAuthorizations } from "../drizzle/schema";

export type CommercialEditorialAuthorization = Pick<typeof commercialEditorialAuthorizations.$inferSelect,
  "status" | "allowPhotos" | "allowVideos" | "allowOrganizationName" | "allowLocation" | "allowStory" | "allowPeopleIdentification" | "allowPortal" | "allowInstitutional" | "allowSocial" | "authorizedAt" | "expiresAt" | "revokedAt"
>;

export function isEditorialAuthorizationCurrent(authorization: CommercialEditorialAuthorization | null | undefined, now = new Date()) {
  if (!authorization || authorization.revokedAt || !authorization.authorizedAt) return false;
  if (!["Autorizada", "Autorização parcial"].includes(authorization.status)) return false;
  return !authorization.expiresAt || authorization.expiresAt > now;
}

export function canUseOnPortal(authorization: CommercialEditorialAuthorization | null | undefined, now = new Date()) {
  return isEditorialAuthorizationCurrent(authorization, now) && authorization!.allowPortal && (authorization!.allowPhotos || authorization!.allowVideos || authorization!.allowStory);
}

export function canUseCommercialMedia(authorization: CommercialEditorialAuthorization | null | undefined, mediaType: "foto" | "vídeo", now = new Date()) {
  return canUseOnPortal(authorization, now) && (mediaType === "foto" ? authorization!.allowPhotos : authorization!.allowVideos);
}

export function canUseCommercialNarrative(authorization: CommercialEditorialAuthorization | null | undefined, now = new Date()) {
  return canUseOnPortal(authorization, now) && authorization!.allowStory;
}

export function canUseCommercialLocation(authorization: CommercialEditorialAuthorization | null | undefined, now = new Date()) {
  return canUseOnPortal(authorization, now) && authorization!.allowLocation;
}
