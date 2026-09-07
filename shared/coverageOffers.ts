const OPEN_STATUSES = new Set(["Solicitação"]);
const CLOSED_STATUSES = new Set(["Aceite", "Contratado", "Produção", "Entrega", "Concluído", "Arquivado"]);
export const COVERAGE_OFFER_DAYS = 14;

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isCoverageOfferExpired(request: { eventDate?: Date | string | null; createdAt?: Date | string | null }, now = new Date()) {
  const eventDate = request.eventDate ? new Date(request.eventDate) : null;
  if (eventDate && !Number.isNaN(eventDate.getTime()) && eventDate.getTime() < now.getTime() - 12 * 60 * 60 * 1000) return true;
  const createdAt = request.createdAt ? new Date(request.createdAt) : null;
  if (createdAt && !Number.isNaN(createdAt.getTime()) && now.getTime() - createdAt.getTime() > COVERAGE_OFFER_DAYS * 24 * 60 * 60 * 1000) return true;
  return false;
}

export function isCoverageOfferOpen(request: {
  managedByUserId?: number | null;
  status?: string | null;
  eventDate?: Date | string | null;
  createdAt?: Date | string | null;
  needsPhotography?: boolean | null;
  needsVideo?: boolean | null;
  needsMiniclip?: boolean | null;
  needsDocumentary?: boolean | null;
  needsFullCoverage?: boolean | null;
}, now = new Date()) {
  if (request.managedByUserId) return false;
  if (!OPEN_STATUSES.has(String(request.status || ""))) return false;
  if (CLOSED_STATUSES.has(String(request.status || ""))) return false;
  const wantsRecord = request.needsPhotography || request.needsVideo || request.needsMiniclip || request.needsDocumentary || request.needsFullCoverage;
  if (!wantsRecord) return false;
  if (isCoverageOfferExpired(request, now)) return false;
  return true;
}

export function coverageMatchesTerritory(request: { location?: string | null; state?: string | null }, territoryName: string) {
  const place = fold(`${request.location || ""} ${request.state || ""}`);
  const territory = fold(territoryName);
  if (!place || !territory) return false;
  if (place.includes(territory) || territory.includes(place)) return true;
  const city = fold(territoryName.split(/[—,-]/)[0] || "");
  const ufMatch = territoryName.match(/\b([A-Za-z]{2})\s*$/);
  const uf = ufMatch ? fold(ufMatch[1]) : "";
  if (city && place.includes(city)) {
    if (!request.state) return true;
    const stateFold = fold(request.state);
    if (uf && (stateFold === uf || stateFold.includes(uf) || place.includes(uf))) return true;
    if (stateFold && (territory.includes(stateFold) || city.includes(stateFold))) return true;
  }
  return false;
}
