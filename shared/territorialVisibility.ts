import { paymentControlsDirectoryVisibility } from "./paymentProvider";
import { PRODUCTION_MINICLIP_CAP, PRODUCTION_MINICLIP_SECONDS, PRODUCTION_PHOTO_CAP, productionMediaWithinLimit } from "./networkProductions";

/** Superfícies públicas. Não misturar editorial, diretório e comercial. */
export const visibilitySurfaces = ["portal", "directory", "home", "commercial"] as const;
export type VisibilitySurface = (typeof visibilitySurfaces)[number];

export type VisibilityDecision = {
  allowed: boolean;
  reason: string;
  visibilityType: VisibilitySurface | "none";
  editorialEligible: boolean;
  commercialEligible: boolean;
  directoryEligible: boolean;
  /** Reserva para frequency/rotação; sempre null nesta fase (sem persistência nova). */
  exposureCooldownUntil: null;
};

export function emptyDenied(reason: string): VisibilityDecision {
  return {
    allowed: false,
    reason,
    visibilityType: "none",
    editorialEligible: false,
    commercialEligible: false,
    directoryEligible: false,
    exposureCooldownUntil: null,
  };
}

export function decideProfessionalDirectory(input: { status: string; publicVisible: boolean }): VisibilityDecision {
  if (input.status === "Suspenso" || input.status === "Rascunho") {
    return emptyDenied(input.status === "Suspenso" ? "Perfil suspenso não entra no diretório." : "Perfil em rascunho não entra no diretório.");
  }
  if (input.status !== "Ativo") return emptyDenied("Somente perfil Ativo pode aparecer na Rede.");
  if (!input.publicVisible) return emptyDenied("Presença na Rede exige autorização explícita de visibilidade.");
  if (paymentControlsDirectoryVisibility()) return emptyDenied("Pagamento não pode comprar diretório.");
  return {
    allowed: true,
    reason: "Perfil ativo e autorizado para a Rede. Sem ranking.",
    visibilityType: "directory",
    editorialEligible: false,
    commercialEligible: false,
    directoryEligible: true,
    exposureCooldownUntil: null,
  };
}

export function decideExecutorPhotographerPage(input: { publicVisible: boolean; publicSlug?: string | null }): VisibilityDecision {
  if (!input.publicVisible || !input.publicSlug) return emptyDenied("Ficha /fotografos exige publicVisible e slug. É legado paralelo ao diretório da Rede.");
  return {
    allowed: true,
    reason: "Ficha documental em /fotografos (networkExecutors), distinta de /rede/profissionais.",
    visibilityType: "directory",
    editorialEligible: false,
    commercialEligible: false,
    directoryEligible: true,
    exposureCooldownUntil: null,
  };
}

export function decidePartnerDirectory(input: { status: string; publicVisibility: boolean }): VisibilityDecision {
  if (input.status !== "Ativo") return emptyDenied("Parceiro inativo não aparece na Rede.");
  if (!input.publicVisibility) return emptyDenied("Parceiro sem visibilidade pública.");
  return {
    allowed: true,
    reason: "Parceiro Ativo com publicVisibility. Não é vitrine paga de ranking.",
    visibilityType: "directory",
    editorialEligible: false,
    commercialEligible: false,
    directoryEligible: true,
    exposureCooldownUntil: null,
  };
}

export function decideCommunityHouseDirectory(input: {
  status: string;
  consentStatus: string;
  deletedAt?: Date | string | null;
  directoryScope: string;
  hasActiveInstitutionalVisibilityPlan: boolean;
}): VisibilityDecision {
  if (input.deletedAt) return emptyDenied("Casa na lixeira não é pública.");
  if (input.status !== "Publicada") return emptyDenied("Casa não publicada.");
  if (input.consentStatus !== "Autorizado") return emptyDenied("Sem consentimento autorizado.");
  if (input.directoryScope === "Serviço comunitário" && !input.hasActiveInstitutionalVisibilityPlan) {
    return emptyDenied("Serviço comunitário só entra com plano de visibilidade institucional vigente (identificado, não ranking).");
  }
  return {
    allowed: true,
    reason: "Casa publicada com consentimento. Serviço comunitário exige plano ativo.",
    visibilityType: "directory",
    editorialEligible: false,
    commercialEligible: input.directoryScope === "Serviço comunitário",
    directoryEligible: true,
    exposureCooldownUntil: null,
  };
}

export function publicationEligibleForPortal(input: {
  status: string;
  isPublic: boolean;
  quarantinedAt?: Date | string | null;
  deletedAt?: Date | string | null;
  commercialRequestId?: number | null;
  commerciallyAuthorized: boolean;
}): boolean {
  if (input.status !== "Publicada" || !input.isPublic || input.quarantinedAt || input.deletedAt) return false;
  if (input.commercialRequestId != null && !input.commerciallyAuthorized) return false;
  return true;
}

export function decidePublicationPortal(input: Parameters<typeof publicationEligibleForPortal>[0]): VisibilityDecision {
  if (!publicationEligibleForPortal(input)) {
    return emptyDenied("Publicação fora do portal: status, isPublic, quarentena, lixeira ou autorização comercial.");
  }
  return {
    allowed: true,
    reason: "Publicação editorial no portal. Não é feed nem diretório.",
    visibilityType: "portal",
    editorialEligible: true,
    commercialEligible: Boolean(input.commercialRequestId),
    directoryEligible: false,
    exposureCooldownUntil: null,
  };
}

export function isEditorialHomeSurface(input: { homePlacement: string; manualFeatured: boolean }) {
  return input.homePlacement !== "Nenhum" || input.manualFeatured;
}

export function decideHomeCuration(input: {
  publication: Parameters<typeof publicationEligibleForPortal>[0] & { homePlacement: string; manualFeatured: boolean; sponsored?: boolean };
}): VisibilityDecision {
  const portal = decidePublicationPortal(input.publication);
  if (!portal.allowed) return portal;
  if (!isEditorialHomeSurface(input.publication)) {
    return { ...portal, allowed: false, reason: "No portal, mas fora da Home curada.", visibilityType: "portal" };
  }
  return {
    allowed: true,
    reason: input.publication.sponsored
      ? "Home curada com identificação comercial (sponsored). Pagamento não ordena a vitrine."
      : "Home curada (homePlacement/manualFeatured). Não é cronologia nem ranking.",
    visibilityType: "home",
    editorialEligible: true,
    commercialEligible: Boolean(input.publication.sponsored),
    directoryEligible: false,
    exposureCooldownUntil: null,
  };
}

export function directoryTerritoryFilter(contentTerritoryId: number | null | undefined, filterTerritoryId: number | null | undefined) {
  if (!filterTerritoryId) return true;
  return contentTerritoryId === filterTerritoryId;
}

export function commercialVisibilityIsNotEditorialCuration() {
  return true;
}

export function paymentNeverBuysEditorialOrDirectory() {
  return !paymentControlsDirectoryVisibility();
}

export function directorySortIsAlphabetical() {
  return true;
}

export function opportunityIsPublicSurface() {
  return false;
}

export const knownOpportunityOrigins = ["Comercial", "Mesa", "Manual"] as const;

/** Origens futuras (sem coluna nova nesta fase). */
export const futureOpportunityOriginators = [
  "oju",
  "profissional",
  "participante-rede",
  "parceiro-casa-instituicao",
  "contato-externo",
] as const;

export function professionalMayOriginateOpportunityWithoutPublishing() {
  return true;
}

export function salesVolumeDoesNotRankDirectory(_closedDeals: number) {
  return directorySortIsAlphabetical();
}

export function mediaWindowIsPerEditorialUnitNotPerProfessional() {
  return {
    photos: PRODUCTION_PHOTO_CAP,
    miniclips: PRODUCTION_MINICLIP_CAP,
    seconds: PRODUCTION_MINICLIP_SECONDS,
    perProfessionalCap: null as null,
  };
}

export function sameProfessionalMayHaveMultipleMediaWindows(productionCount: number) {
  return productionCount >= 1;
}

export { productionMediaWithinLimit, PRODUCTION_PHOTO_CAP, PRODUCTION_MINICLIP_CAP, PRODUCTION_MINICLIP_SECONDS };
