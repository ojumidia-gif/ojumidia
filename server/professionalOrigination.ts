import { TRPCError } from "@trpc/server";
import { desc, eq, like } from "drizzle-orm";
import { commercialActivities, commercialRequests, professionalProfiles, taxonomies } from "../drizzle/schema";
import {
  needsFromWorkType,
  parseOriginFromNotes,
  professionalCanOriginateLead,
  professionalOwnsOrigin,
  profileAcceptsPublicServiceRequests,
  stampOriginOnNotes,
  stripOriginFromNotes,
  type CommercialOriginRecord,
} from "@shared/professionalOrigination";
import { decideProfessionalDirectory } from "@shared/territorialVisibility";
import { recordAuditEvent } from "./partnerScope";
import { professionalProfileForUser } from "./professionalNetwork";
import { createNetworkNotification } from "./networkNotifications";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Actor = { id: number; role: string };

async function recordActivity(db: Db, requestId: number, actorId: number | null, detail: string) {
  await db.insert(commercialActivities).values({ requestId, actorId, activityType: "Solicitação", detail });
}

export async function createVisitorRequestForProfessional(db: Db, input: {
  professionalSlug: string;
  clientName: string;
  contact: string;
  email?: string;
  whatsapp?: string;
  eventType: string;
  eventDate?: Date;
  eventTime?: string;
  location?: string;
  state?: string;
  duration?: string;
  needsPhotography: boolean;
  needsVideo: boolean;
  needsMiniclip: boolean;
  needsDocumentary: boolean;
  needsFullCoverage: boolean;
  needsFormatGuidance: boolean;
  objective?: string;
  notes?: string;
}) {
  const profile = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.publicSlug, input.professionalSlug)).limit(1))[0];
  if (!profile || !profileAcceptsPublicServiceRequests({ status: profile.status, publicVisible: profile.publicVisible })) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Esta presença não recebe solicitações públicas." });
  }
  if (!decideProfessionalDirectory({ status: profile.status, publicVisible: profile.publicVisible }).allowed) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Esta presença não está na Rede." });
  }
  const origin: CommercialOriginRecord = {
    v: 1,
    kind: "visitante-profissional",
    originatedByProfessionalProfileId: null,
    requestedProfessionalProfileId: profile.id,
    createdByUserId: null,
  };
  const notes = stampOriginOnNotes(input.notes, origin);
  const result = await db.insert(commercialRequests).values({
    clientName: input.clientName,
    contact: input.contact,
    email: input.email,
    whatsapp: input.whatsapp,
    eventType: input.eventType,
    eventDate: input.eventDate,
    eventTime: input.eventTime,
    location: input.location,
    state: input.state,
    duration: input.duration,
    needsPhotography: input.needsPhotography,
    needsVideo: input.needsVideo,
    needsMiniclip: input.needsMiniclip,
    needsDocumentary: input.needsDocumentary,
    needsFullCoverage: input.needsFullCoverage,
    needsFormatGuidance: input.needsFormatGuidance,
    objective: input.objective,
    notes,
    territoryId: profile.territoryId,
    partnerId: profile.partnerId,
    status: "Solicitação",
  });
  const id = Number(result[0].insertId);
  await recordActivity(db, id, null, `Solicitação pública dirigida à presença #${profile.id}. Não é contratação instantânea nem anúncio.`);
  await recordAuditEvent(db, {
    actorId: null,
    partnerId: profile.partnerId,
    territoryId: profile.territoryId,
    resourceType: "commercial-request",
    resourceId: id,
    action: "professional_service_requested",
    nextState: { origin, status: "Solicitação", published: false, featured: false },
    detail: "Visitante solicitou serviço via perfil da Rede. Origem ≠ createdBy. Sem Opportunity automática. Sem Home.",
  });
  if (profile.userId) {
    await createNetworkNotification(db, {
      actorId: null,
      recipientUserId: profile.userId,
      type: "professional_service_request",
      referenceType: "commercial-request",
      referenceId: id,
      partnerId: profile.partnerId,
      territoryId: profile.territoryId,
    });
  }
  return { id, professionalProfileId: profile.id, published: false as const };
}

export async function submitProfessionalOrigination(db: Db, actor: Actor, input: {
  clientName: string;
  contact: string;
  title: string;
  briefing: string;
  workType: "Cobertura" | "Documentário" | "Fotografia" | "Outro";
  eventDate?: Date | null;
  durationText?: string | null;
}) {
  const profile = await professionalProfileForUser(db, actor.id);
  if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "Somente integrante com perfil profissional Ativo origina demanda." });
  const allowed = professionalCanOriginateLead(profile);
  if (!allowed.ok) throw new TRPCError({ code: "FORBIDDEN", message: allowed.message });
  const origin: CommercialOriginRecord = {
    v: 1,
    kind: "profissional",
    originatedByProfessionalProfileId: profile.id,
    requestedProfessionalProfileId: profile.id,
    createdByUserId: actor.id,
  };
  const needs = needsFromWorkType(input.workType);
  const territory = profile.territoryId
    ? (await db.select({ name: taxonomies.name }).from(taxonomies).where(eq(taxonomies.id, profile.territoryId)).limit(1))[0]
    : null;
  const notes = stampOriginOnNotes(null, origin);
  const result = await db.insert(commercialRequests).values({
    clientName: input.clientName.trim().slice(0, 200),
    contact: input.contact.trim().slice(0, 280),
    eventType: input.title.trim().slice(0, 180),
    eventDate: input.eventDate ?? null,
    duration: input.durationText?.trim() || null,
    location: territory?.name || null,
    objective: input.briefing.trim().slice(0, 4000),
    notes,
    ...needs,
    territoryId: profile.territoryId,
    partnerId: profile.partnerId,
    status: "Solicitação",
  });
  const id = Number(result[0].insertId);
  await recordActivity(db, id, actor.id, `Originação territorial pelo perfil profissional #${profile.id}. createdByUserId=${actor.id}. Não é Opportunity nem publicação.`);
  await recordAuditEvent(db, {
    actorId: actor.id,
    partnerId: profile.partnerId,
    territoryId: profile.territoryId,
    resourceType: "commercial-request",
    resourceId: id,
    action: "professional_opportunity_originated",
    nextState: {
      origin,
      createdByUserId: actor.id,
      originatedByProfessionalProfileId: profile.id,
      status: "Solicitação",
      opportunityCreated: false,
      publicationCreated: false,
      homeFeatured: false,
    },
    detail: "Profissional originou demanda para análise da Rede. Não concede RBAC administrativo. Não compra curadoria.",
  });
  if (profile.userId) {
    await createNetworkNotification(db, {
      actorId: actor.id,
      recipientUserId: profile.userId,
      type: "professional_origination_submitted",
      referenceType: "commercial-request",
      referenceId: id,
      partnerId: profile.partnerId,
      territoryId: profile.territoryId,
    });
  }
  return { id, originatedByProfessionalProfileId: profile.id, createdByUserId: actor.id, opportunityCreated: false as const };
}

export async function listMyOriginationLeads(db: Db, actor: Actor) {
  const profile = await professionalProfileForUser(db, actor.id);
  if (!profile) return { profile: null, items: [] as Array<{ id: number; eventType: string; status: string; createdAt: Date; originKind: string }> };
  const rows = await db.select({
    id: commercialRequests.id,
    eventType: commercialRequests.eventType,
    status: commercialRequests.status,
    notes: commercialRequests.notes,
    createdAt: commercialRequests.createdAt,
  }).from(commercialRequests).where(like(commercialRequests.notes, "%OJU_ORIGIN_V1:%")).orderBy(desc(commercialRequests.createdAt));
  const items = rows.flatMap(row => {
    const origin = parseOriginFromNotes(row.notes);
    if (!professionalOwnsOrigin(origin, profile.id)) return [];
    return [{ id: row.id, eventType: row.eventType, status: row.status, createdAt: row.createdAt, originKind: origin!.kind }];
  });
  return { profile: { id: profile.id, displayName: profile.displayName }, items };
}

export function briefingWithoutOrigin(objective: string | null, notes: string | null) {
  return [objective, stripOriginFromNotes(notes)].filter(Boolean).join("\n\n");
}

export { parseOriginFromNotes };
