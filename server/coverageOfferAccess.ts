import { and, eq, inArray } from "drizzle-orm";
import { coverageOfferDeclines, partnerTerritories, taxonomies } from "../drizzle/schema";
import { coverageMatchesTerritory, isCoverageOfferOpen } from "@shared/coverageOffers";
import { partnerReceivesCoverageOffers } from "@shared/partnerVocations";
import { specialtiesReceiveCoverageOffers } from "@shared/professionalSpecialties";
import { professionalProfileForUser } from "./professionalNetwork";
import { activePartnerMemberships } from "./partnerScope";
import { ensureCoverageOfferDeclinesTable } from "./coverageOfferDeclinesTable";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function partnerCoverageContext(db: Db, userId: number) {
  const memberships = await activePartnerMemberships(db, userId);
  const partnerIds = memberships.map(item => item.partnerId);
  const territoryRows = partnerIds.length
    ? await db.select({
      partnerId: partnerTerritories.partnerId,
      territoryId: partnerTerritories.territoryId,
      name: taxonomies.name,
    }).from(partnerTerritories).innerJoin(taxonomies, eq(partnerTerritories.territoryId, taxonomies.id)).where(and(inArray(partnerTerritories.partnerId, partnerIds), eq(partnerTerritories.status, "Ativa")))
    : [];
  const vocationSource = memberships.map(item => item.partnerDescription || "").join(" · ");
  const profile = await professionalProfileForUser(db, userId);
  const receivesCoverageOffers = profile?.specialtyIds.length
    ? specialtiesReceiveCoverageOffers(profile.specialtyIds)
    : partnerReceivesCoverageOffers(vocationSource);
  return {
    memberships,
    territories: territoryRows,
    receivesCoverageOffers,
  };
}

export function offerMatchesPartner(
  request: {
    partnerId: number | null;
    territoryId: number | null;
    location: string | null;
    state: string | null;
    managedByUserId: number | null;
    status: string;
    eventDate: Date | null;
    createdAt: Date;
    needsPhotography: boolean;
    needsVideo: boolean;
    needsMiniclip: boolean;
    needsDocumentary: boolean;
    needsFullCoverage: boolean;
  },
  context: Awaited<ReturnType<typeof partnerCoverageContext>>,
) {
  if (!context.receivesCoverageOffers) return false;
  if (!isCoverageOfferOpen(request)) return false;
  if (request.partnerId && !context.memberships.some(item => item.partnerId === request.partnerId)) return false;
  if (request.territoryId) return context.territories.some(item => item.territoryId === request.territoryId);
  return context.territories.some(item => coverageMatchesTerritory(request, item.name));
}

export function matchingPartnerTerritory(
  request: { location: string | null; state: string | null; partnerId: number | null; territoryId: number | null },
  context: Awaited<ReturnType<typeof partnerCoverageContext>>,
) {
  if (request.territoryId) {
    return context.territories.find(item => item.territoryId === request.territoryId) || null;
  }
  if (request.partnerId) {
    const ofPartner = context.territories.filter(item => item.partnerId === request.partnerId);
    return ofPartner.find(item => coverageMatchesTerritory(request, item.name)) || ofPartner[0] || null;
  }
  return context.territories.find(item => coverageMatchesTerritory(request, item.name)) || null;
}

export async function declinedOfferIds(db: Db, userId: number) {
  await ensureCoverageOfferDeclinesTable(db);
  const rows = await db.select({ requestId: coverageOfferDeclines.requestId }).from(coverageOfferDeclines).where(eq(coverageOfferDeclines.userId, userId));
  return new Set(rows.map(item => item.requestId));
}
