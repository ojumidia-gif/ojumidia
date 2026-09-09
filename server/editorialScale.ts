import { isEditorialHomeSurface } from "@shared/territorialVisibility";

export function slugifyEditorial(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function isHomeCurated(publication: { homePlacement: string; manualFeatured: boolean }) {
  return isEditorialHomeSurface(publication);
}

export const homePlacementRank: Record<string, number> = {
  "Destaque principal": 0,
  "Destaque secundário": 1,
  Recomendado: 2,
  Nenhum: 3,
};

export function sortHomeCurated<T extends { homePlacement: string; homeOrder: number; manualFeatured: boolean; relevance: number }>(items: T[]) {
  return [...items].sort((a, b) => (homePlacementRank[a.homePlacement] ?? 3) - (homePlacementRank[b.homePlacement] ?? 3) || a.homeOrder - b.homeOrder || Number(b.manualFeatured) - Number(a.manualFeatured) || b.relevance - a.relevance);
}

export function isHomeHighlightUnexpired(highlightExpiresAt: Date | string | null | undefined, now = new Date()) {
  if (!highlightExpiresAt) return true;
  return new Date(highlightExpiresAt) > now;
}

export const adminListInput = {
  limitMax: 100,
  defaultLimit: 40,
};

export function publicationIdsFullyInTerritoryScope(input: {
  publicationIds: number[];
  territoryLinks: Array<{ publicationId: number; taxonomyId: number }>;
  authorizedTerritoryIds: number[];
}) {
  const authorized = new Set(input.authorizedTerritoryIds);
  const byPublication = new Map<number, number[]>();
  for (const link of input.territoryLinks) {
    const current = byPublication.get(link.publicationId) || [];
    current.push(link.taxonomyId);
    byPublication.set(link.publicationId, current);
  }
  return input.publicationIds.filter(id => {
    const territories = byPublication.get(id) || [];
    return territories.length > 0 && territories.every(territoryId => authorized.has(territoryId));
  });
}
