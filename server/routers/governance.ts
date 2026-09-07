import { TRPCError } from "@trpc/server";
import { desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { governanceCaseCategories, governanceCaseEvents, governanceCases, governanceLegalHolds, governanceSecurityAlerts, publications, users } from "../../drizzle/schema";
import { formatAdminId, isClosedCaseStatus, parseAdminId } from "@shared/governance";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import {
  buildEvidencePackage,
  createGovernanceCase,
  liftPublicationQuarantine,
  placeLegalHold,
  quarantineMedia,
  quarantinePublication,
  releaseLegalHold,
} from "../governance";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

function requirePrincipal(role: string) {
  if (role !== "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "Somente o administrador principal pode gerir denúncias e evidências." });
}

export const governanceRouter = router({
  listCases: protectedProcedure.input(z.object({
    query: z.string().max(120).optional(),
    status: z.enum(["Aberta", "Em análise", "Quarentena", "Resolvida", "Rejeitada", "Arquivada"]).optional(),
  }).optional()).query(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const rows = await db.select().from(governanceCases).orderBy(desc(governanceCases.createdAt)).limit(200);
    const needle = input?.query?.trim().toLowerCase() ?? "";
    const adminId = needle ? parseAdminId(needle) : null;
    const filtered = rows.filter(row => {
      if (input?.status && row.status !== input.status) return false;
      if (!needle) return true;
      if (adminId && row.subjectUserId === adminId) return true;
      return row.publicCode.toLowerCase().includes(needle) || row.title.toLowerCase().includes(needle) || row.category.toLowerCase().includes(needle);
    });
    return { items: filtered };
  }),
  getCase: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const item = (await db.select().from(governanceCases).where(eq(governanceCases.id, input.id)).limit(1))[0];
    if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Denúncia não encontrada." });
    const events = await db.select().from(governanceCaseEvents).where(eq(governanceCaseEvents.caseId, item.id)).orderBy(desc(governanceCaseEvents.createdAt));
    const holds = await db.select().from(governanceLegalHolds).where(eq(governanceLegalHolds.caseId, item.id));
    const subject = item.subjectUserId ? (await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, accountStatus: users.accountStatus }).from(users).where(eq(users.id, item.subjectUserId)).limit(1))[0] : null;
    return {
      item,
      events,
      holds,
      subject: subject ? { ...subject, adminId: formatAdminId(subject.id) } : null,
    };
  }),
  createCase: protectedProcedure.input(z.object({
    kind: z.enum(["Denúncia", "Incidente"]).default("Denúncia"),
    category: z.enum(governanceCaseCategories),
    priority: z.enum(["Baixa", "Média", "Alta", "Urgente"]).optional(),
    title: z.string().min(4).max(280),
    description: z.string().min(8).max(8000),
    publicationId: z.number().int().positive().nullable().optional(),
    mediaId: z.number().int().positive().nullable().optional(),
    subjectUserId: z.number().int().positive().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    try {
      return await createGovernanceCase(db, { actorId: ctx.user.id, ...input });
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível abrir a denúncia." });
    }
  }),
  updateCase: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    status: z.enum(["Aberta", "Em análise", "Quarentena", "Resolvida", "Rejeitada", "Arquivada"]).optional(),
    outcome: z.enum(["Não confirmada", "Violação confirmada"]).nullable().optional(),
    assigneeId: z.number().int().positive().nullable().optional(),
    decisionNote: z.string().max(4000).nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(governanceCases).where(eq(governanceCases.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Denúncia não encontrada." });
    const status = input.status ?? current.status;
    const outcome = input.outcome === undefined ? current.outcome : input.outcome;
    if ((status === "Resolvida" || status === "Rejeitada") && !outcome) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Registre se a denúncia foi confirmada ou não confirmada." });
    }
    await db.update(governanceCases).set({
      status,
      outcome,
      assigneeId: input.assigneeId === undefined ? current.assigneeId : input.assigneeId,
      decisionNote: input.decisionNote === undefined ? current.decisionNote : input.decisionNote,
      decidedBy: isClosedCaseStatus(status) ? ctx.user.id : current.decidedBy,
      decidedAt: isClosedCaseStatus(status) ? new Date() : current.decidedAt,
    }).where(eq(governanceCases.id, current.id));
    if (status === "Rejeitada" && current.publicationId && (await db.select().from(publications).where(eq(publications.id, current.publicationId)).limit(1))[0]?.quarantinedAt) {
      await liftPublicationQuarantine(db, ctx.user.id, current.publicationId, current.id);
    }
    await db.insert(governanceCaseEvents).values({ caseId: current.id, actorId: ctx.user.id, action: "report-reviewed", detail: `${status}${outcome ? ` · ${outcome}` : ""}` });
    return { success: true };
  }),
  quarantine: protectedProcedure.input(z.object({
    caseId: z.number().int().positive(),
    publicationId: z.number().int().positive().optional(),
    mediaId: z.number().int().positive().optional(),
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    if (!input.publicationId && !input.mediaId) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a publicação ou a mídia a preservar." });
    const db = await requireDb();
    if (input.publicationId) await quarantinePublication(db, ctx.user.id, input.publicationId, input.caseId);
    if (input.mediaId) await quarantineMedia(db, ctx.user.id, input.mediaId, input.caseId);
    return { success: true };
  }),
  preserve: protectedProcedure.input(z.object({
    caseId: z.number().int().positive(),
    resourceType: z.enum(["publication", "media", "user"]),
    resourceId: z.number().int().positive(),
    reason: z.string().min(3).max(2000),
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    await placeLegalHold(db, ctx.user.id, input.caseId, input.resourceType, input.resourceId, input.reason);
    return { success: true };
  }),
  releaseHold: protectedProcedure.input(z.object({
    holdId: z.number().int().positive(),
    reason: z.string().min(3).max(2000),
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    try {
      await releaseLegalHold(db, ctx.user.id, input.holdId, input.reason);
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível encerrar a preservação." });
    }
    return { success: true };
  }),
  exportEvidence: protectedProcedure.input(z.object({ caseId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    try {
      return await buildEvidencePackage(db, ctx.user.id, input.caseId);
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível exportar o pacote." });
    }
  }),
  alerts: protectedProcedure.query(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const items = await db.select().from(governanceSecurityAlerts).orderBy(desc(governanceSecurityAlerts.createdAt)).limit(80);
    return { items };
  }),
  searchAdmins: protectedProcedure.input(z.object({ query: z.string().max(160).optional() })).query(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const needle = input.query?.trim() ?? "";
    const adminId = parseAdminId(needle);
    const accounts = adminId
      ? await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, accountStatus: users.accountStatus, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.id, adminId)).limit(40)
      : needle
        ? await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, accountStatus: users.accountStatus, lastSignedIn: users.lastSignedIn }).from(users).where(or(like(users.email, `%${needle}%`), like(users.name, `%${needle}%`))).limit(40)
        : await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, accountStatus: users.accountStatus, lastSignedIn: users.lastSignedIn }).from(users).limit(40);
    return { items: accounts.map(account => ({ ...account, adminId: formatAdminId(account.id) })) };
  }),
});
