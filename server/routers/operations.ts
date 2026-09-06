import { and, desc, eq, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import {
  administratorResponsibilityTerms,
  auditEvents,
  authorizationTerms,
  commercialEditorialAuthorizations,
  commercialRefundRequests,
  commercialRequests,
  communityCareRequests,
  communityEvents,
  contracts,
  adminDeskMessages,
  highlightSuggestions,
  institutionVisibilitySubscriptions,
  institutions,
  mediaAssets,
  oralMemories,
  publicationTaxonomies,
  publications,
  taxonomies,
  uploadSessions,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { EDITORIAL_TRASH_RETENTION_MS } from "../editorialTrash";
import { activePartnerMemberships, partnerTerritoryIds } from "../partnerScope";
import { protectedProcedure, router } from "../_core/trpc";

type Priority = "Crítica" | "Atenção" | "Acompanhamento";
type PendingItem = {
  id: string;
  category: string;
  priority: Priority;
  title: string;
  description: string;
  href: string;
  createdAt: Date;
  dueAt: Date | null;
  partnerId: number | null;
  territoryId: number | null;
};

const priorityRank: Record<Priority, number> = { "Crítica": 0, "Atenção": 1, "Acompanhamento": 2 };

export function orderOperationalPendencies(items: PendingItem[]) {
  return [...items].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) || b.createdAt.getTime() - a.createdAt.getTime());
}

function requireDb() {
  return getDb().then(db => {
    if (!db) throw new Error("Banco de dados indisponível.");
    return db;
  });
}

export const operationsRouter = router({
  overview: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(40) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const principal = ctx.user.role === "administrador principal";
    const memberships = principal ? [] : await activePartnerMemberships(db, ctx.user.id);
    const territoryScopes = new Map<number, number[]>();
    for (const membership of memberships) territoryScopes.set(membership.partnerId, await partnerTerritoryIds(db, membership.partnerId));
    const membershipIds = new Set(memberships.map(item => item.partnerId));
    const visible = (record: { partnerId?: number | null; territoryId?: number | null }, ownerId?: number | null) => {
      if (principal) return true;
      if (record.partnerId) return membershipIds.has(record.partnerId) && (!record.territoryId || territoryScopes.get(record.partnerId)?.includes(record.territoryId) === true);
      return ownerId === ctx.user.id;
    };
    const now = new Date();
    const attentionDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const items: PendingItem[] = [];
    const add = (item: PendingItem, ownerId?: number | null) => { if (visible(item, ownerId)) items.push(item); };

    const [publicationRows, scheduledRows, mediaRows, requestRows, authorizationRows, authorizationTermRows, refundRows, contractRows, suggestionRows, visibilityRows, institutionRows, eventRows, memoryRows, careRows, uploadRows, mediaTrashRows] = await Promise.all([
      db.select().from(publications).where(or(eq(publications.status, "Em revisão"), isNotNull(publications.deletedAt))).orderBy(desc(publications.updatedAt)),
      db.select().from(publications).where(and(eq(publications.status, "Aprovada"), isNotNull(publications.scheduledAt), isNull(publications.deletedAt))).orderBy(publications.scheduledAt),
      db.select().from(mediaAssets).where(and(eq(mediaAssets.uploadStatus, "Pronto"), eq(mediaAssets.state, "Ativo"), isNull(mediaAssets.deletedAt))).orderBy(desc(mediaAssets.createdAt)),
      db.select().from(commercialRequests).where(inArray(commercialRequests.status, ["Solicitação", "Em análise", "Proposta", "Aceite", "Entrega"])).orderBy(desc(commercialRequests.updatedAt)),
      db.select().from(commercialEditorialAuthorizations).where(eq(commercialEditorialAuthorizations.status, "Pendente")).orderBy(desc(commercialEditorialAuthorizations.updatedAt)),
      db.select().from(authorizationTerms).where(eq(authorizationTerms.status, "Aguardando assinatura gov.br")).orderBy(desc(authorizationTerms.createdAt)),
      db.select().from(commercialRefundRequests).where(inArray(commercialRefundRequests.status, ["Solicitado", "Em análise", "Aprovado"])).orderBy(desc(commercialRefundRequests.updatedAt)),
      db.select().from(contracts).where(eq(contracts.status, "Enviado")).orderBy(desc(contracts.createdAt)),
      db.select().from(highlightSuggestions).where(eq(highlightSuggestions.status, "Sugerida")).orderBy(desc(highlightSuggestions.createdAt)),
      db.select().from(institutionVisibilitySubscriptions).where(and(inArray(institutionVisibilitySubscriptions.status, ["Ativa", "Aguardando confirmação"]), lte(institutionVisibilitySubscriptions.expiresAt, attentionDeadline))).orderBy(institutionVisibilitySubscriptions.expiresAt),
      db.select().from(institutions).where(and(isNull(institutions.deletedAt), or(eq(institutions.consentStatus, "Pendente"), eq(institutions.status, "Em revisão")))).orderBy(desc(institutions.updatedAt)),
      db.select().from(communityEvents).where(and(isNull(communityEvents.deletedAt), or(eq(communityEvents.consentStatus, "Pendente"), eq(communityEvents.status, "Em revisão")))).orderBy(desc(communityEvents.updatedAt)),
      db.select().from(oralMemories).where(and(isNull(oralMemories.deletedAt), or(eq(oralMemories.consentStatus, "Pendente"), eq(oralMemories.status, "Em revisão"), and(isNotNull(oralMemories.generatedTranscript), isNotNull(oralMemories.aiProcessedAt), isNull(oralMemories.aiReviewedAt))))).orderBy(desc(oralMemories.updatedAt)),
      db.select().from(communityCareRequests).where(inArray(communityCareRequests.status, ["Recebida", "Em acolhimento"])).orderBy(desc(communityCareRequests.updatedAt)),
      db.select().from(uploadSessions).where(inArray(uploadSessions.status, ["Enviando", "Enviado", "Processando", "Falhou"])).orderBy(desc(uploadSessions.updatedAt)),
      db.select().from(mediaAssets).where(isNotNull(mediaAssets.deletedAt)).orderBy(desc(mediaAssets.deletedAt)),
    ]);

    const reviewIds = publicationRows.filter(row => row.status === "Em revisão").map(row => row.id);
    const publicationTerritoryLinks = reviewIds.length ? await db.select().from(publicationTaxonomies).where(inArray(publicationTaxonomies.publicationId, reviewIds)) : [];
    const taxonomyIds = Array.from(new Set(publicationTerritoryLinks.map(link => link.taxonomyId)));
    const territoryTaxonomies = taxonomyIds.length ? await db.select({ id: taxonomies.id }).from(taxonomies).where(and(inArray(taxonomies.id, taxonomyIds), eq(taxonomies.dimension, "Território"))) : [];
    const territoryTaxonomyIds = new Set(territoryTaxonomies.map(item => item.id));
    const territoriesByPublication = new Map<number, number[]>();
    publicationTerritoryLinks.filter(link => territoryTaxonomyIds.has(link.taxonomyId)).forEach(link => territoriesByPublication.set(link.publicationId, [...(territoriesByPublication.get(link.publicationId) || []), link.taxonomyId]));
    const relatedRequestIds = Array.from(new Set([...authorizationRows.map(row => row.requestId), ...authorizationTermRows.map(row => row.requestId), ...refundRows.map(row => row.requestId)]));
    const missingRequestIds = relatedRequestIds.filter(id => !requestRows.some(row => row.id === id));
    const relatedRequests = missingRequestIds.length ? await db.select().from(commercialRequests).where(inArray(commercialRequests.id, missingRequestIds)) : [];
    const requestsById = new Map([...requestRows, ...relatedRequests].map(row => [row.id, row]));
    const relatedInstitutionIds = Array.from(new Set(visibilityRows.map(row => row.institutionId)));
    const missingInstitutionIds = relatedInstitutionIds.filter(id => !institutionRows.some(row => row.id === id));
    const relatedInstitutions = missingInstitutionIds.length ? await db.select().from(institutions).where(inArray(institutions.id, missingInstitutionIds)) : [];
    const institutionsById = new Map([...institutionRows, ...relatedInstitutions].map(row => [row.id, row]));

    for (const publication of publicationRows) {
      if (publication.status === "Em revisão") {
        const territories = territoriesByPublication.get(publication.id) || [];
        const canRead = principal || (!publication.partnerId ? publication.createdBy === ctx.user.id : membershipIds.has(publication.partnerId) && territories.some(id => territoryScopes.get(publication.partnerId!)?.includes(id)));
        if (canRead) items.push({ id: `publication-review-${publication.id}`, category: "Editorial", priority: "Atenção", title: publication.title, description: "Publicação aguardando revisão editorial.", href: "/admin/publicacoes", createdAt: publication.updatedAt, dueAt: null, partnerId: publication.partnerId, territoryId: territories[0] ?? null });
      }
      if (principal && publication.deletedAt) items.push({ id: `publication-trash-${publication.id}`, category: "Lixeira editorial", priority: publication.deletedAt.getTime() + EDITORIAL_TRASH_RETENTION_MS <= now.getTime() ? "Crítica" : "Acompanhamento", title: publication.title, description: "Publicação na Lixeira Editorial dentro da janela de retenção ou aguardando expurgo.", href: "/admin/lixeira-editorial", createdAt: publication.deletedAt, dueAt: new Date(publication.deletedAt.getTime() + EDITORIAL_TRASH_RETENTION_MS), partnerId: publication.partnerId, territoryId: null });
    }
    for (const publication of scheduledRows) {
      const canRead = principal || (!publication.partnerId ? publication.createdBy === ctx.user.id : membershipIds.has(publication.partnerId));
      if (canRead) items.push({ id: `publication-scheduled-${publication.id}`, category: "Editorial", priority: "Acompanhamento", title: publication.title, description: "Conteúdo aprovado aguardando publicação automática na data programada.", href: "/admin/publicacoes", createdAt: publication.updatedAt, dueAt: publication.scheduledAt, partnerId: publication.partnerId, territoryId: null });
    }
    if (principal) mediaTrashRows.forEach(media => items.push({ id: `media-trash-${media.id}`, category: "Lixeira de mídia", priority: "Atenção", title: media.filename || `Mídia #${media.id}`, description: "Mídia na Lixeira: segunda chance. Excluir definitivamente é irreversível.", href: "/admin/lixeira-midias", createdAt: media.deletedAt || media.createdAt, dueAt: null, partnerId: media.partnerId, territoryId: media.territoryId }));
    mediaRows.forEach(media => add({ id: `media-approval-${media.id}`, category: "Mídia", priority: "Atenção", title: media.filename || `Mídia #${media.id}`, description: "Upload pronto aguardando aprovação ou rejeição no Acervo.", href: "/admin/midias", createdAt: media.createdAt, dueAt: null, partnerId: media.partnerId, territoryId: media.territoryId }, media.createdBy));
    requestRows.forEach(request => add({ id: `commercial-${request.id}`, category: "Comercial", priority: request.status === "Solicitação" && !request.managedByUserId ? "Crítica" : "Atenção", title: request.clientName, description: `Solicitação comercial na etapa “${request.status}”.`, href: "/admin/solicitacoes", createdAt: request.updatedAt, dueAt: request.eventDate, partnerId: request.partnerId, territoryId: request.territoryId }, request.managedByUserId));
    authorizationRows.forEach(authorization => { const request = requestsById.get(authorization.requestId); if (request) add({ id: `authorization-${authorization.id}`, category: "Autorização", priority: "Atenção", title: request.clientName, description: "Autorização editorial ainda pendente para trabalho contratado.", href: "/admin/solicitacoes", createdAt: authorization.updatedAt, dueAt: authorization.expiresAt, partnerId: request.partnerId, territoryId: request.territoryId }, request.managedByUserId); });
    authorizationTermRows.forEach(term => { const request = requestsById.get(term.requestId); if (request) add({ id: `authorization-term-${term.id}`, category: "Termos", priority: "Crítica", title: request.clientName, description: "Termo de autorização aguarda assinatura exclusiva via gov.br.", href: "/admin/solicitacoes", createdAt: term.createdAt, dueAt: null, partnerId: request.partnerId, territoryId: request.territoryId }, request.managedByUserId); });
    refundRows.forEach(refund => { const request = requestsById.get(refund.requestId); if (request) add({ id: `refund-${refund.id}`, category: "Financeiro", priority: refund.status === "Aprovado" ? "Crítica" : "Atenção", title: request.clientName, description: `Pedido de reembolso em “${refund.status}”.`, href: "/admin/politicas-comerciais", createdAt: refund.updatedAt, dueAt: null, partnerId: request.partnerId, territoryId: request.territoryId }, request.managedByUserId); });
    contractRows.forEach(contract => add({ id: `contract-${contract.id}`, category: "Contrato", priority: contract.status === "Enviado" ? "Atenção" : "Acompanhamento", title: contract.contractor, description: `Contrato em “${contract.status}”.`, href: "/admin/contratos", createdAt: contract.createdAt, dueAt: null, partnerId: contract.partnerId, territoryId: null }, contract.managedByUserId));
    suggestionRows.forEach(suggestion => add({ id: `highlight-${suggestion.id}`, category: "Curadoria", priority: "Acompanhamento", title: `Sugestão de destaque #${suggestion.publicationId}`, description: "Parceiro aguarda decisão nacional de curadoria para a Home.", href: "/admin/destaques", createdAt: suggestion.createdAt, dueAt: null, partnerId: suggestion.partnerId, territoryId: suggestion.territoryId }));
    visibilityRows.forEach(subscription => { const institution = institutionsById.get(subscription.institutionId); if (institution) add({ id: `visibility-${subscription.id}`, category: "Visibilidade", priority: subscription.expiresAt <= now ? "Crítica" : "Atenção", title: institution.name, description: subscription.expiresAt <= now ? "Plano de visibilidade institucional vencido." : "Plano de visibilidade próximo do vencimento.", href: "/admin/visibilidade-institucional", createdAt: subscription.createdAt, dueAt: subscription.expiresAt, partnerId: institution.partnerId, territoryId: institution.territoryId }, institution.managedByUserId); });
    institutionRows.forEach(institution => add({ id: `institution-${institution.id}`, category: "Comunidade", priority: "Atenção", title: institution.name, description: institution.consentStatus === "Pendente" ? "Perfil institucional aguarda consentimento." : "Perfil institucional aguarda revisão.", href: "/admin/comunidade", createdAt: institution.updatedAt, dueAt: null, partnerId: institution.partnerId, territoryId: institution.territoryId }, institution.managedByUserId));
    eventRows.forEach(event => add({ id: `event-${event.id}`, category: "Comunidade", priority: "Atenção", title: event.title, description: event.consentStatus === "Pendente" ? "Agenda comunitária aguarda consentimento." : "Agenda comunitária aguarda revisão.", href: "/admin/comunidade", createdAt: event.updatedAt, dueAt: event.startsAt, partnerId: event.partnerId, territoryId: event.territoryId }, event.managedByUserId));
    memoryRows.forEach(memory => add({ id: `memory-${memory.id}`, category: "Memórias", priority: memory.aiProcessedAt && !memory.aiReviewedAt ? "Atenção" : "Acompanhamento", title: memory.title, description: memory.aiProcessedAt && !memory.aiReviewedAt ? "Memória oral com conteúdo assistido aguardando revisão humana." : "Memória oral aguarda consentimento ou revisão.", href: "/admin/revisar-memorias", createdAt: memory.updatedAt, dueAt: null, partnerId: memory.partnerId, territoryId: memory.territoryId }, memory.managedByUserId));
    careRows.forEach(care => add({ id: `care-${care.id}`, category: "Acolhimento", priority: care.status === "Recebida" ? "Crítica" : "Atenção", title: `Pedido de acolhimento: ${care.requestType}`, description: "Pedido reservado exige acompanhamento responsável; dados de contato não são exibidos aqui.", href: "/admin/notificacoes-acolhimento", createdAt: care.updatedAt, dueAt: null, partnerId: care.partnerId, territoryId: care.territoryId }, care.managedByUserId));
    uploadRows.forEach(session => add({ id: `upload-${session.id}`, category: "Upload", priority: session.status === "Falhou" ? "Crítica" : "Atenção", title: session.filename, description: session.status === "Falhou" ? (session.errorMessage || "O envio falhou e pode ser retomado com o mesmo identificador.") : `Arquivo em “${session.status}”. Você pode continuar trabalhando enquanto o processamento termina.`, href: "/admin/midias", createdAt: session.updatedAt, dueAt: null, partnerId: session.partnerId, territoryId: session.territoryId }, session.userId));
    if (principal) {
      const responsibilityTerms = await db.select().from(administratorResponsibilityTerms).where(eq(administratorResponsibilityTerms.status, "Aguardando assinatura gov.br")).orderBy(desc(administratorResponsibilityTerms.createdAt));
      responsibilityTerms.forEach(term => items.push({ id: `responsibility-${term.id}`, category: "Governança", priority: "Crítica", title: term.email, description: "Administrador autorizado aguarda assinatura do termo de responsabilidade via gov.br.", href: "/admin/colaboradores", createdAt: term.createdAt, dueAt: null, partnerId: null, territoryId: null }));
      const deskRows = await db.select().from(adminDeskMessages).where(eq(adminDeskMessages.status, "Aberta")).orderBy(desc(adminDeskMessages.createdAt));
      deskRows.forEach(row => items.push({
        id: `desk-${row.id}`,
        category: "Canal Ojú",
        priority: row.category === "Erro" || row.category === "Estabilidade" ? "Crítica" : "Atenção",
        title: row.subject,
        description: `${row.category}: mensagem aberta no Canal Ojú.`,
        href: "/admin/canal",
        createdAt: row.createdAt,
        dueAt: null,
        partnerId: null,
        territoryId: null,
      }));
    }
    const ordered = orderOperationalPendencies(items);
    const summary = { total: ordered.length, critical: ordered.filter(item => item.priority === "Crítica").length, attention: ordered.filter(item => item.priority === "Atenção").length, followUp: ordered.filter(item => item.priority === "Acompanhamento").length };
    return { summary, items: ordered.slice(0, input.limit), scope: principal ? "global" : "territorial" };
  }),
  auditLog: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(80) }).optional()).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "administrador principal") throw new Error("Somente o Super Admin consulta o registro administrativo.");
    const db = await requireDb();
    return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(input?.limit ?? 80);
  }),
});
