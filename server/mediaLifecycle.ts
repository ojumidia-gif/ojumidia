import { count, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import {
  commercialMiniclips,
  communityEvents,
  institutions,
  mediaAssets,
  oralMemories,
  partners,
  publicationMedia,
  publications,
  revenueLeads,
  taxonomyMedia,
  uploadSessions,
} from "../drizzle/schema";
import { getDb } from "./db";
import { recordAuditEvent } from "./partnerScope";
import { confirmPhrasesMatch } from "@shared/confirmPhrase";
import { storageDeleteConfirmed, storageInspect, type StorageInspectResult } from "./storage";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type MediaRow = typeof mediaAssets.$inferSelect;
type UploadRow = typeof uploadSessions.$inferSelect;

export const ABANDONED_UPLOAD_RETENTION_MS = 24 * 60 * 60 * 1000;
export const ORPHAN_COMPLETED_UPLOAD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const MEDIA_PURGE_PIPELINE = [
  "require-trash",
  "require-no-usages",
  "audit-attempt",
  "delete-storage-confirmed",
  "delete-mediaAssets",
  "delete-unused-uploadSession",
  "audit-success",
] as const;

export type MediaUsage = { kind: string; id: number; label: string };

export const GENERATED_ARTIFACT_INVENTORY = [
  {
    kind: "PDF de termo de responsabilidade",
    createdBy: "Centro Administrativo (jspdf no navegador)",
    storedAt: "Download local do operador; metadado em administratorResponsibilityTerms",
    hasDeleteButton: false,
    expires: false,
    accumulatesInTigris: false,
    note: "Não gera objeto no Tigris. O PDF assinado via gov.br é anexado depois pelo Super Admin se houver URL.",
  },
  {
    kind: "PDF de termo de autorização comercial",
    createdBy: "Solicitações comerciais (jspdf no navegador)",
    storedAt: "Download local; metadado em authorizationTerms",
    hasDeleteButton: false,
    expires: false,
    accumulatesInTigris: false,
    note: "Não é exportação da Auditoria. auditEvents permanece no MySQL.",
  },
  {
    kind: "Auditoria administrativa",
    createdBy: "recordAuditEvent",
    storedAt: "Tabela auditEvents (Aiven)",
    hasDeleteButton: false,
    expires: false,
    accumulatesInTigris: false,
    note: "Trilha documental. Não é lixeira e não deve ser expurgada com a mídia.",
  },
  {
    kind: "Snapshots de conteúdo do portal",
    createdBy: "portalContentActivities",
    storedAt: "MySQL",
    hasDeleteButton: false,
    expires: false,
    accumulatesInTigris: false,
    note: "Histórico de blocos CMS; não são arquivos de storage.",
  },
  {
    kind: "Upload de mídia",
    createdBy: "POST /api/media/upload",
    storedAt: "Tigris + uploadSessions + mediaAssets",
    hasDeleteButton: true,
    expires: "Sessões abandonadas: 24h incompletas / 7d prontas sem registro no Acervo",
    accumulatesInTigris: true,
    note: "Única origem de objetos de acervo. Purge definitivo só com media.purge. Super Admin pode limpar sessões técnicas sem mídia no Acervo.",
  },
] as const;

export function is403NotAbsence(result: StorageInspectResult) {
  return result.status === "forbidden";
}

export function uploadSessionCleanupClass(session: Pick<UploadRow, "status" | "createdAt" | "completedAt">, now: Date, hasMediaAsset: boolean) {
  const ageMs = now.getTime() - session.createdAt.getTime();
  const incomplete = ["Criado", "Enviando", "Enviado", "Processando", "Falhou", "Cancelado"].includes(session.status);
  if (hasMediaAsset) return "linked" as const;
  if (incomplete && ageMs >= ABANDONED_UPLOAD_RETENTION_MS) return "abandoned-incomplete" as const;
  if (!incomplete && ["Pronto", "Aprovado", "Publicado", "Rejeitado"].includes(session.status) && ageMs >= ORPHAN_COMPLETED_UPLOAD_RETENTION_MS) {
    return "abandoned-completed" as const;
  }
  return "retain" as const;
}

export function confirmationMatchesMedia(media: Pick<MediaRow, "id" | "filename">, confirmation: string) {
  const expected = media.filename?.trim() || `mídia #${media.id}`;
  return confirmPhrasesMatch(expected, confirmation);
}

export async function collectMediaUsages(db: Database, mediaId: number): Promise<MediaUsage[]> {
  const [publicationLinks, taxonomies, partnerLogos, partnerProfiles, institutionRows, eventRows, memoryRows, miniclips, leads] = await Promise.all([
    db.select({ id: publicationMedia.id, publicationId: publicationMedia.publicationId, title: publications.title }).from(publicationMedia).leftJoin(publications, eq(publicationMedia.publicationId, publications.id)).where(eq(publicationMedia.mediaId, mediaId)),
    db.select({ id: taxonomyMedia.id, taxonomyId: taxonomyMedia.taxonomyId }).from(taxonomyMedia).where(eq(taxonomyMedia.mediaId, mediaId)),
    db.select({ id: partners.id, displayName: partners.displayName }).from(partners).where(eq(partners.logoMediaId, mediaId)),
    db.select({ id: partners.id, displayName: partners.displayName }).from(partners).where(eq(partners.profileMediaId, mediaId)),
    db.select({ id: institutions.id, name: institutions.name }).from(institutions).where(eq(institutions.primaryMediaId, mediaId)),
    db.select({ id: communityEvents.id, title: communityEvents.title }).from(communityEvents).where(eq(communityEvents.coverMediaId, mediaId)),
    db.select({ id: oralMemories.id, title: oralMemories.title }).from(oralMemories).where(eq(oralMemories.videoMediaId, mediaId)),
    db.select({ id: commercialMiniclips.id }).from(commercialMiniclips).where(eq(commercialMiniclips.mediaId, mediaId)),
    db.select({ id: revenueLeads.id, contactName: revenueLeads.contactName }).from(revenueLeads).where(eq(revenueLeads.mediaId, mediaId)),
  ]);

  const usages: MediaUsage[] = [];
  publicationLinks.forEach(row => usages.push({ kind: "publicationMedia", id: row.publicationId, label: `Publicação “${row.title || row.publicationId}”` }));
  taxonomies.forEach(row => usages.push({ kind: "taxonomyMedia", id: row.taxonomyId, label: `Taxonomia #${row.taxonomyId}` }));
  partnerLogos.forEach(row => usages.push({ kind: "partners.logoMediaId", id: row.id, label: `Logo do parceiro “${row.displayName}”` }));
  partnerProfiles.forEach(row => usages.push({ kind: "partners.profileMediaId", id: row.id, label: `Perfil do parceiro “${row.displayName}”` }));
  institutionRows.forEach(row => usages.push({ kind: "institutions.primaryMediaId", id: row.id, label: `Instituição “${row.name}”` }));
  eventRows.forEach(row => usages.push({ kind: "communityEvents.coverMediaId", id: row.id, label: `Evento “${row.title}”` }));
  memoryRows.forEach(row => usages.push({ kind: "oralMemories.videoMediaId", id: row.id, label: `Memória oral “${row.title}”` }));
  miniclips.forEach(row => usages.push({ kind: "commercialMiniclips.mediaId", id: row.id, label: `Miniclip comercial #${row.id}` }));
  leads.forEach(row => usages.push({ kind: "revenueLeads.mediaId", id: row.id, label: `Lead de licenciamento “${row.contactName}”` }));
  return usages;
}

export function formatMediaUsageBlock(usages: MediaUsage[]) {
  return usages.map(item => `${item.kind}: ${item.label}`).join("; ");
}

export async function inspectMediaObject(media: Pick<MediaRow, "storageKey">): Promise<StorageInspectResult> {
  if (!media.storageKey) return { status: "absent" };
  return storageInspect(media.storageKey);
}

export async function purgeMediaAsset(db: Database, actorId: number, media: MediaRow, confirmation: string) {
  if (!media.deletedAt) {
    throw new Error("Envie a mídia à Lixeira de mídia antes da exclusão definitiva.");
  }
  if (!confirmationMatchesMedia(media, confirmation)) {
    throw new Error("Digite o nome exato do arquivo (ou “mídia #id”) para confirmar a exclusão definitiva.");
  }

  const usages = await collectMediaUsages(db, media.id);
  if (usages.length) {
    throw new Error(`Esta mídia ainda está em uso. Remova os vínculos antes do expurgo: ${formatMediaUsageBlock(usages)}`);
  }

  if (media.storageKey) {
    const siblings = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.storageKey, media.storageKey));
    if (siblings.some(row => row.id !== media.id)) {
      throw new Error("A mesma chave de storage ainda é referenciada por outra mídia do Acervo. O expurgo foi recusado para não destruir um objeto compartilhado.");
    }
  }

  await recordAuditEvent(db, {
    actorId,
    partnerId: media.partnerId,
    territoryId: media.territoryId,
    resourceType: "media",
    resourceId: media.id,
    action: "media-purge-attempted",
    previousState: {
      filename: media.filename,
      storageKey: media.storageKey,
      uploadId: media.uploadId,
      deletedAt: media.deletedAt.toISOString(),
    },
    detail: `Tentativa de exclusão definitiva da mídia #${media.id}.`,
  });

  let storageResult: { key: string; alreadyAbsent: boolean } | null = null;
  if (media.storageKey) {
    try {
      storageResult = await storageDeleteConfirmed(media.storageKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha de storage.";
      await recordAuditEvent(db, {
        actorId,
        partnerId: media.partnerId,
        territoryId: media.territoryId,
        resourceType: "media",
        resourceId: media.id,
        action: "media-purge-failed",
        previousState: { storageKey: media.storageKey },
        nextState: { error: message },
        detail: `Expurgo interrompido: o metadado permanece na Lixeira. ${message}`,
      });
      throw error;
    }
  }

  await db.delete(mediaAssets).where(eq(mediaAssets.id, media.id));

  let uploadSessionRemoved = false;
  if (media.uploadId) {
    const stillLinked = (await db.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.uploadId, media.uploadId)).limit(1))[0];
    if (!stillLinked) {
      await db.delete(uploadSessions).where(eq(uploadSessions.id, media.uploadId));
      uploadSessionRemoved = true;
    }
  }

  await recordAuditEvent(db, {
    actorId,
    partnerId: media.partnerId,
    territoryId: media.territoryId,
    resourceType: "media",
    resourceId: media.id,
    action: "media-permanently-purged",
    previousState: {
      filename: media.filename,
      storageKey: media.storageKey,
      uploadId: media.uploadId,
    },
    nextState: {
      storageRemoved: Boolean(storageResult),
      storageAlreadyAbsent: storageResult?.alreadyAbsent ?? !media.storageKey,
      uploadSessionRemoved,
    },
    detail: `Exclusão definitiva concluída. Arquivo ${storageResult?.alreadyAbsent ? "já ausente ou inexistente (404)" : "removido"}; metadado removido; sessão ${uploadSessionRemoved ? "removida" : "mantida porque ainda tinha finalidade"}.`,
  });

  return { success: true as const, alreadyPurged: false as const, uploadSessionRemoved, storageAlreadyAbsent: storageResult?.alreadyAbsent ?? !media.storageKey };
}

export async function restoreMediaIfRecoverable(db: Database, actorId: number, media: MediaRow) {
  if (!media.deletedAt) {
    throw new Error("Esta mídia não está na Lixeira de mídia.");
  }
  if (media.storageKey) {
    const inspect = await storageInspect(media.storageKey);
    if (inspect.status === "forbidden") {
      throw new Error("O Tigris recusou a inspeção (HTTP 403). 403 não significa que o arquivo sumiu; a restauração ficou bloqueada até o storage responder com autorização válida.");
    }
    if (inspect.status === "error") {
      throw new Error(`Não foi possível confirmar se o objeto ainda é recuperável. ${inspect.message}`);
    }
    if (inspect.status === "absent") {
      throw new Error("O objeto físico não existe mais (404/NoSuchKey). Restaurar é impossível; use Excluir definitivamente para remover o metadado órfão.");
    }
  }

  await db.update(mediaAssets).set({ state: "Arquivado", deletedAt: null, deletedBy: null, deletionNote: null }).where(eq(mediaAssets.id, media.id));
  await recordAuditEvent(db, {
    actorId,
    partnerId: media.partnerId,
    territoryId: media.territoryId,
    resourceType: "media",
    resourceId: media.id,
    action: "media-restored",
    previousState: { deletedAt: media.deletedAt.toISOString() },
    nextState: { deletedAt: null, state: "Arquivado" },
    detail: "Mídia restaurada da Lixeira para o Acervo como arquivada.",
  });
}

export async function listAbandonedUploadSessions(db: Database, now = new Date()) {
  const sessions = await db.select().from(uploadSessions);
  const linkedIds = new Set((await db.select({ uploadId: mediaAssets.uploadId }).from(mediaAssets).where(isNotNull(mediaAssets.uploadId))).map(row => row.uploadId));
  return sessions
    .map(session => ({ session, klass: uploadSessionCleanupClass(session, now, linkedIds.has(session.id)) }))
    .filter(item => item.klass !== "retain" && item.klass !== "linked");
}

export async function listUnlinkedUploadSessions(db: Database) {
  const sessions = await db.select().from(uploadSessions);
  const linkedIds = new Set((await db.select({ uploadId: mediaAssets.uploadId }).from(mediaAssets).where(isNotNull(mediaAssets.uploadId))).map(row => row.uploadId));
  return sessions.filter(session => !linkedIds.has(session.id));
}

export async function cleanupAbandonedUploadSession(db: Database, actorId: number, session: UploadRow, now = new Date(), options?: { force?: boolean }) {
  const linked = (await db.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.uploadId, session.id)).limit(1))[0];
  const klass = uploadSessionCleanupClass(session, now, Boolean(linked));
  if (klass === "linked") {
    throw new Error("Esta sessão ainda tem finalidade ou não atingiu a política de abandono.");
  }
  if (klass === "retain" && !options?.force) {
    throw new Error("Esta sessão ainda tem finalidade ou não atingiu a política de abandono.");
  }

  if (session.storageKey) {
    const mediaWithKey = (await db.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.storageKey, session.storageKey)).limit(1))[0];
    if (mediaWithKey) {
      await db.delete(uploadSessions).where(eq(uploadSessions.id, session.id));
      await recordAuditEvent(db, {
        actorId,
        resourceType: "upload-session",
        resourceId: null,
        action: "upload-session-cleaned",
        previousState: { uploadId: session.id, storageKey: session.storageKey, keptObject: true },
        detail: "Sessão abandonada removida; o objeto foi preservado porque ainda há mídia no Acervo com a mesma chave.",
      });
      return { storageRemoved: false };
    }
    await storageDeleteConfirmed(session.storageKey);
  }

  await db.delete(uploadSessions).where(eq(uploadSessions.id, session.id));
  await recordAuditEvent(db, {
    actorId,
    resourceType: "upload-session",
    resourceId: null,
    action: "upload-session-cleaned",
    previousState: { uploadId: session.id, storageKey: session.storageKey, klass },
    detail: "Sessão de upload abandonada removida conforme política de retenção técnica (não é expurgo de mídia do Acervo).",
  });
  return { storageRemoved: Boolean(session.storageKey) };
}

export async function cleanupExpiredAbandonedUploads(db: Database, actorId = -1, now = new Date()) {
  const abandoned = await listAbandonedUploadSessions(db, now);
  const cleaned: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  for (const item of abandoned) {
    try {
      await cleanupAbandonedUploadSession(db, actorId, item.session, now);
      cleaned.push(item.session.id);
    } catch (error) {
      failed.push({ id: item.session.id, error: error instanceof Error ? error.message : "falha" });
    }
  }
  return { cleanedUploadSessionIds: cleaned, failed };
}

export async function mediaOccupancy(db: Database) {
  const [active, trashed, sessions, mediaBytes, sessionBytes, consumers] = await Promise.all([
    db.select({ value: count() }).from(mediaAssets).where(isNull(mediaAssets.deletedAt)),
    db.select({ value: count() }).from(mediaAssets).where(isNotNull(mediaAssets.deletedAt)),
    db.select({ value: count() }).from(uploadSessions),
    db.select({ value: sql<number>`coalesce(sum(${mediaAssets.fileSize}), 0)` }).from(mediaAssets),
    db.select({ value: sql<number>`coalesce(sum(${uploadSessions.fileSize}), 0)` }).from(uploadSessions).leftJoin(mediaAssets, eq(mediaAssets.uploadId, uploadSessions.id)).where(isNull(mediaAssets.id)),
    db.select({
      userId: mediaAssets.createdBy,
      files: count(),
      bytes: sql<number>`coalesce(sum(${mediaAssets.fileSize}), 0)`,
    }).from(mediaAssets).groupBy(mediaAssets.createdBy).orderBy(desc(sql`coalesce(sum(${mediaAssets.fileSize}), 0)`)).limit(20),
  ]);
  const recordedBytes = Number(mediaBytes[0]?.value || 0) + Number(sessionBytes[0]?.value || 0);
  return {
    activeCount: Number(active[0]?.value || 0),
    trashCount: Number(trashed[0]?.value || 0),
    uploadSessionCount: Number(sessions[0]?.value || 0),
    recordedBytes,
    consumers: consumers.map(row => ({ userId: row.userId, files: Number(row.files || 0), bytes: Number(row.bytes || 0) })),
  };
}
