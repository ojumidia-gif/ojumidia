import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  auditEvents,
  governanceCaseCounters,
  governanceCaseEvents,
  governanceCases,
  governanceEvidenceExports,
  governanceLegalHolds,
  governanceSecurityAlerts,
  mediaAssets,
  publications,
  users,
} from "../drizzle/schema";
import { formatAdminId, formatGovernanceCaseCode, isClosedCaseStatus, stripSensitiveAuditValue } from "@shared/governance";
import { getDb } from "./db";
import { recordAuditEvent } from "./partnerScope";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export class GovernanceHoldError extends Error {
  constructor(message = "Este item está sob preservação de evidência e não pode ser expurgado.") {
    super(message);
    this.name = "GovernanceHoldError";
  }
}

export async function assertResourcePurgeAllowed(db: Database, resourceType: "publication" | "media" | "user", resourceId: number) {
  const hold = (await db.select({ id: governanceLegalHolds.id }).from(governanceLegalHolds).where(and(
    eq(governanceLegalHolds.resourceType, resourceType),
    eq(governanceLegalHolds.resourceId, resourceId),
    isNull(governanceLegalHolds.releasedAt),
  )).limit(1))[0];
  if (hold) throw new GovernanceHoldError();

  if (resourceType === "publication") {
    const linked = (await db.select({ id: governanceCases.id, status: governanceCases.status }).from(governanceCases).where(eq(governanceCases.publicationId, resourceId)))[0];
    if (linked && !isClosedCaseStatus(linked.status)) {
      throw new GovernanceHoldError("Há denúncia ou incidente aberto vinculado a este conteúdo.");
    }
  }
  if (resourceType === "media") {
    const linked = (await db.select({ id: governanceCases.id, status: governanceCases.status }).from(governanceCases).where(eq(governanceCases.mediaId, resourceId)))[0];
    if (linked && !isClosedCaseStatus(linked.status)) {
      throw new GovernanceHoldError("Há denúncia ou incidente aberto vinculado a esta mídia.");
    }
  }
  if (resourceType === "user") {
    const openCases = await db.select({ id: governanceCases.id, status: governanceCases.status }).from(governanceCases).where(eq(governanceCases.subjectUserId, resourceId));
    if (openCases.some(item => !isClosedCaseStatus(item.status))) {
      throw new GovernanceHoldError("Há denúncia ou incidente aberto vinculado a esta conta. Revogue o acesso sem apagar o histórico.");
    }
    const holdOnUser = (await db.select({ id: governanceLegalHolds.id }).from(governanceLegalHolds).where(and(
      eq(governanceLegalHolds.resourceType, "user"),
      eq(governanceLegalHolds.resourceId, resourceId),
      isNull(governanceLegalHolds.releasedAt),
    )).limit(1))[0];
    if (holdOnUser) throw new GovernanceHoldError();
  }
}

export async function allocateCaseCode(db: Database, now = new Date()) {
  const year = now.getFullYear();
  const current = (await db.select().from(governanceCaseCounters).where(eq(governanceCaseCounters.year, year)).limit(1))[0];
  const next = (current?.lastNumber ?? 0) + 1;
  if (current) await db.update(governanceCaseCounters).set({ lastNumber: next }).where(eq(governanceCaseCounters.year, year));
  else await db.insert(governanceCaseCounters).values({ year, lastNumber: next });
  return formatGovernanceCaseCode(year, next);
}

export async function appendCaseEvent(db: Database, caseId: number, actorId: number | null, action: string, detail?: string) {
  await db.insert(governanceCaseEvents).values({ caseId, actorId, action, detail: detail ?? null });
}

export async function recordSecurityAlert(db: Database, input: {
  kind: string;
  title: string;
  detail?: string;
  severity?: "info" | "alerta" | "critico";
  actorUserId?: number | null;
  subjectUserId?: number | null;
  caseId?: number | null;
}) {
  await db.insert(governanceSecurityAlerts).values({
    kind: input.kind,
    title: input.title,
    detail: input.detail ?? null,
    severity: input.severity ?? "alerta",
    actorUserId: input.actorUserId ?? null,
    subjectUserId: input.subjectUserId ?? null,
    caseId: input.caseId ?? null,
  });
}

export async function createGovernanceCase(db: Database, input: {
  actorId: number;
  kind: "Denúncia" | "Incidente";
  category: typeof governanceCases.$inferInsert["category"];
  priority?: typeof governanceCases.$inferInsert["priority"];
  title: string;
  description: string;
  publicationId?: number | null;
  mediaId?: number | null;
  subjectUserId?: number | null;
}) {
  const publicCode = await allocateCaseCode(db);
  const result = await db.insert(governanceCases).values({
    publicCode,
    kind: input.kind,
    category: input.category,
    priority: input.priority ?? "Média",
    title: input.title,
    description: input.description,
    publicationId: input.publicationId ?? null,
    mediaId: input.mediaId ?? null,
    subjectUserId: input.subjectUserId ?? null,
    createdBy: input.actorId,
  });
  const id = Number(result[0].insertId);
  await appendCaseEvent(db, id, input.actorId, "report-created", `Caso ${publicCode} aberto.`);
  await recordAuditEvent(db, {
    actorId: input.actorId,
    resourceType: "governance-case",
    resourceId: id,
    action: "report-created",
    nextState: stripSensitiveAuditValue({ publicCode, kind: input.kind, category: input.category, publicationId: input.publicationId ?? null, mediaId: input.mediaId ?? null, subjectUserId: input.subjectUserId ?? null }),
    detail: `Denúncia ${publicCode} registrada. Não implica violação confirmada.`,
  });
  await recordSecurityAlert(db, {
    kind: "denuncia-aberta",
    title: `Nova denúncia ${publicCode}`,
    detail: input.title,
    actorUserId: input.actorId,
    subjectUserId: input.subjectUserId ?? null,
    caseId: id,
  });
  return { id, publicCode };
}

export async function quarantinePublication(db: Database, actorId: number, publicationId: number, caseId: number) {
  const publication = (await db.select().from(publications).where(eq(publications.id, publicationId)).limit(1))[0];
  if (!publication) throw new Error("Publicação não encontrada.");
  await db.update(publications).set({
    quarantinedAt: new Date(),
    quarantinedBy: actorId,
    quarantineCaseId: caseId,
    quarantinePreviousPublic: publication.isPublic,
    isPublic: false,
  }).where(eq(publications.id, publicationId));
  await db.update(governanceCases).set({ status: "Quarentena" }).where(eq(governanceCases.id, caseId));
  await appendCaseEvent(db, caseId, actorId, "content-quarantined", `Publicação #${publicationId} retirada do portal e preservada.`);
  await recordAuditEvent(db, {
    actorId,
    partnerId: publication.partnerId,
    resourceType: "publication",
    resourceId: publicationId,
    action: "content-quarantined",
    previousState: { isPublic: publication.isPublic, quarantinedAt: null },
    nextState: { isPublic: false, caseId },
    detail: "Conteúdo em quarentena. Arquivo original não é destruído.",
  });
}

export async function liftPublicationQuarantine(db: Database, actorId: number, publicationId: number, caseId: number) {
  const publication = (await db.select().from(publications).where(eq(publications.id, publicationId)).limit(1))[0];
  if (!publication) throw new Error("Publicação não encontrada.");
  const restorePublic = publication.status === "Publicada" && Boolean(publication.quarantinePreviousPublic);
  await db.update(publications).set({
    quarantinedAt: null,
    quarantinedBy: null,
    quarantineCaseId: null,
    quarantinePreviousPublic: null,
    isPublic: restorePublic,
  }).where(eq(publications.id, publicationId));
  await appendCaseEvent(db, caseId, actorId, "quarantine-lifted", `Quarentena da publicação #${publicationId} removida.`);
  await recordAuditEvent(db, {
    actorId,
    partnerId: publication.partnerId,
    resourceType: "publication",
    resourceId: publicationId,
    action: "content-restored-from-quarantine",
    nextState: { isPublic: restorePublic },
    detail: "Quarentena removida após decisão administrativa.",
  });
}

export async function quarantineMedia(db: Database, actorId: number, mediaId: number, caseId: number) {
  const media = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1))[0];
  if (!media) throw new Error("Mídia não encontrada.");
  await db.update(mediaAssets).set({
    quarantinedAt: new Date(),
    quarantinedBy: actorId,
    quarantineCaseId: caseId,
    publicationAllowed: false,
  }).where(eq(mediaAssets.id, mediaId));
  await appendCaseEvent(db, caseId, actorId, "content-quarantined", `Mídia #${mediaId} preservada sem destruição do arquivo.`);
  await recordAuditEvent(db, {
    actorId,
    partnerId: media.partnerId,
    territoryId: media.territoryId,
    resourceType: "media",
    resourceId: mediaId,
    action: "content-quarantined",
    nextState: { caseId, checksum: media.checksum ?? null },
    detail: "Mídia em quarentena. Objeto no storage permanece.",
  });
}

export async function placeLegalHold(db: Database, actorId: number, caseId: number, resourceType: string, resourceId: number, reason: string) {
  const existing = (await db.select().from(governanceLegalHolds).where(and(
    eq(governanceLegalHolds.caseId, caseId),
    eq(governanceLegalHolds.resourceType, resourceType),
    eq(governanceLegalHolds.resourceId, resourceId),
    isNull(governanceLegalHolds.releasedAt),
  )).limit(1))[0];
  if (existing) return existing;
  const result = await db.insert(governanceLegalHolds).values({ caseId, resourceType, resourceId, reason, createdBy: actorId });
  await appendCaseEvent(db, caseId, actorId, "evidence-preserved", `${resourceType} #${resourceId}`);
  await recordAuditEvent(db, {
    actorId,
    resourceType,
    resourceId,
    action: "evidence-preserved",
    nextState: { caseId, reason },
    detail: "Preservação de evidência (legal hold técnico). Políticas de retenção devem ser validadas juridicamente.",
  });
  return { id: Number(result[0].insertId) };
}

export async function releaseLegalHold(db: Database, actorId: number, holdId: number, reason: string) {
  const hold = (await db.select().from(governanceLegalHolds).where(eq(governanceLegalHolds.id, holdId)).limit(1))[0];
  if (!hold) throw new Error("Preservação não encontrada.");
  if (hold.releasedAt) throw new Error("Esta preservação já foi encerrada.");
  await db.update(governanceLegalHolds).set({ releasedAt: new Date(), releasedBy: actorId, releaseReason: reason }).where(eq(governanceLegalHolds.id, holdId));
  await appendCaseEvent(db, hold.caseId, actorId, "evidence-hold-released", reason);
  await recordAuditEvent(db, {
    actorId,
    resourceType: hold.resourceType,
    resourceId: hold.resourceId,
    action: "evidence-hold-released",
    previousState: { holdId, caseId: hold.caseId },
    detail: reason,
  });
}

export async function buildEvidencePackage(db: Database, actorId: number, caseId: number) {
  const caseRow = (await db.select().from(governanceCases).where(eq(governanceCases.id, caseId)).limit(1))[0];
  if (!caseRow) throw new Error("Caso não encontrado.");
  const events = await db.select().from(governanceCaseEvents).where(eq(governanceCaseEvents.caseId, caseId)).orderBy(desc(governanceCaseEvents.createdAt));
  const holds = await db.select().from(governanceLegalHolds).where(eq(governanceLegalHolds.caseId, caseId));
  const auditSelect = {
    id: auditEvents.id,
    createdAt: auditEvents.createdAt,
    actorId: auditEvents.actorId,
    action: auditEvents.action,
    resourceType: auditEvents.resourceType,
    resourceId: auditEvents.resourceId,
    detail: auditEvents.detail,
  };
  const relatedAudit = [
    ...(await db.select(auditSelect).from(auditEvents).where(and(eq(auditEvents.resourceType, "governance-case"), eq(auditEvents.resourceId, caseId))).orderBy(desc(auditEvents.createdAt)).limit(80)),
    ...(caseRow.publicationId ? await db.select(auditSelect).from(auditEvents).where(and(eq(auditEvents.resourceType, "publication"), eq(auditEvents.resourceId, caseRow.publicationId))).orderBy(desc(auditEvents.createdAt)).limit(80) : []),
    ...(caseRow.mediaId ? await db.select(auditSelect).from(auditEvents).where(and(eq(auditEvents.resourceType, "media"), eq(auditEvents.resourceId, caseRow.mediaId))).orderBy(desc(auditEvents.createdAt)).limit(80) : []),
    ...(caseRow.subjectUserId ? await db.select(auditSelect).from(auditEvents).where(and(eq(auditEvents.resourceType, "auth"), eq(auditEvents.resourceId, caseRow.subjectUserId))).orderBy(desc(auditEvents.createdAt)).limit(40) : []),
  ];

  const media = caseRow.mediaId
    ? (await db.select({ id: mediaAssets.id, checksum: mediaAssets.checksum, filename: mediaAssets.filename, storageKey: mediaAssets.storageKey, quarantinedAt: mediaAssets.quarantinedAt }).from(mediaAssets).where(eq(mediaAssets.id, caseRow.mediaId)).limit(1))[0]
    : null;
  const publication = caseRow.publicationId
    ? (await db.select({ id: publications.id, title: publications.title, status: publications.status, isPublic: publications.isPublic, quarantinedAt: publications.quarantinedAt, createdBy: publications.createdBy }).from(publications).where(eq(publications.id, caseRow.publicationId)).limit(1))[0]
    : null;
  const subject = caseRow.subjectUserId
    ? (await db.select({ id: users.id, name: users.name, role: users.role, accountStatus: users.accountStatus }).from(users).where(eq(users.id, caseRow.subjectUserId)).limit(1))[0]
    : null;

  const payload = stripSensitiveAuditValue({
    generatedAt: new Date().toISOString(),
    incidentId: caseRow.publicCode,
    case: {
      id: caseRow.id,
      publicCode: caseRow.publicCode,
      kind: caseRow.kind,
      status: caseRow.status,
      outcome: caseRow.outcome,
      category: caseRow.category,
      priority: caseRow.priority,
      title: caseRow.title,
      decidedAt: caseRow.decidedAt,
    },
    subject: subject ? { adminId: formatAdminId(subject.id), role: subject.role, accountStatus: subject.accountStatus } : null,
    publication,
    media: media ? { id: media.id, filename: media.filename, checksumSha256: media.checksum, quarantinedAt: media.quarantinedAt } : null,
    legalHolds: holds.map(hold => ({
      id: hold.id,
      resourceType: hold.resourceType,
      resourceId: hold.resourceId,
      createdAt: hold.createdAt,
      releasedAt: hold.releasedAt,
    })),
    caseEvents: events,
    auditEvents: relatedAudit,
    disclaimer: "Pacote técnico para análise administrativa. Políticas de retenção e atendimento a autoridades devem ser validadas juridicamente. Não inclui senhas, tokens ou segredos.",
  });
  const serialized = JSON.stringify(payload);
  const packageChecksum = createHash("sha256").update(serialized).digest("hex");
  await db.insert(governanceEvidenceExports).values({
    caseId,
    actorId,
    itemCount: events.length + relatedAudit.length + holds.length,
    packageChecksum,
  });
  await appendCaseEvent(db, caseId, actorId, "evidence-exported", packageChecksum);
  await recordAuditEvent(db, {
    actorId,
    resourceType: "governance-case",
    resourceId: caseId,
    action: "evidence-exported",
    nextState: { publicCode: caseRow.publicCode, packageChecksum, itemCount: events.length + relatedAudit.length },
    detail: `Pacote de evidências ${caseRow.publicCode} exportado.`,
  });
  return { publicCode: caseRow.publicCode, packageChecksum, payload };
}

export async function remindOpenCases(db: Database, olderThanMs = 48 * 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const open = await db.select().from(governanceCases).where(inArray(governanceCases.status, ["Aberta", "Em análise", "Quarentena"]));
  let created = 0;
  for (const item of open) {
    if (item.createdAt > cutoff) continue;
    await recordSecurityAlert(db, {
      kind: "denuncia-pendente",
      title: `Denúncia pendente ${item.publicCode}`,
      detail: "Caso aberto há mais de 48 horas sem encerramento.",
      caseId: item.id,
      subjectUserId: item.subjectUserId,
      severity: "info",
    });
    created += 1;
  }
  return { reminded: created };
}
