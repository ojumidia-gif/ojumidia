import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { confirmPhrasesMatch } from "@shared/confirmPhrase";
import { adminDeskMessages, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { recordAuditEvent } from "../partnerScope";
import { protectedProcedure, router } from "../_core/trpc";

const categories = ["Dúvida", "Erro", "Estabilidade", "Outro"] as const;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

function requirePrincipal(role: string) {
  if (role !== "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Super Admin lê e responde o Canal Ojú." });
}

async function loadDeskMessage(db: Awaited<ReturnType<typeof requireDb>>, id: number) {
  const current = (await db.select().from(adminDeskMessages).where(eq(adminDeskMessages.id, id)).limit(1))[0];
  if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Mensagem não encontrada." });
  return current;
}

export const deskRouter = router({
  send: protectedProcedure.input(z.object({
    category: z.enum(categories),
    subject: z.string().trim().min(4).max(180),
    body: z.string().trim().min(12).max(4000),
    pagePath: z.string().max(320).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(adminDeskMessages).values({
      createdBy: ctx.user.id,
      category: input.category,
      subject: input.subject,
      body: input.body,
      pagePath: input.pagePath?.trim() || null,
      status: "Aberta",
    });
    const id = Number(result[0].insertId);
    await recordAuditEvent(db, {
      actorId: ctx.user.id,
      resourceType: "admin-desk",
      resourceId: id,
      action: "desk-message-sent",
      nextState: { category: input.category },
      detail: "Mensagem enviada ao Canal Ojú do Super Admin.",
    });
    return { id };
  }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(adminDeskMessages).where(eq(adminDeskMessages.createdBy, ctx.user.id)).orderBy(desc(adminDeskMessages.createdAt));
  }),

  inbox: protectedProcedure.query(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const rows = await db.select().from(adminDeskMessages).orderBy(desc(adminDeskMessages.createdAt));
    const authorIds = Array.from(new Set(rows.map(row => row.createdBy)));
    const authors = authorIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, authorIds)) : [];
    const byId = new Map(authors.map(item => [item.id, item]));
    return rows.map(row => ({
      ...row,
      authorName: byId.get(row.createdBy)?.name || "Admin",
      authorEmail: byId.get(row.createdBy)?.email || null,
    }));
  }),

  reply: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    reply: z.string().trim().min(4).max(4000),
    status: z.enum(["Em atendimento", "Resolvida"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = await loadDeskMessage(db, input.id);
    if (current.status === "Arquivada") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Desarquive a mensagem para responder." });
    }
    const status = input.status ?? (current.status === "Aberta" ? "Em atendimento" : current.status);
    await db.update(adminDeskMessages).set({
      reply: input.reply,
      repliedBy: ctx.user.id,
      repliedAt: new Date(),
      status,
    }).where(eq(adminDeskMessages.id, input.id));
    await recordAuditEvent(db, {
      actorId: ctx.user.id,
      resourceType: "admin-desk",
      resourceId: input.id,
      action: "desk-message-replied",
      previousState: { status: current.status },
      nextState: { status },
      detail: "Resposta do Super Admin no Canal Ojú.",
    });
    return { success: true };
  }),

  archive: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = await loadDeskMessage(db, input.id);
    if (current.status === "Arquivada") return { success: true };
    await db.update(adminDeskMessages).set({ status: "Arquivada" }).where(eq(adminDeskMessages.id, input.id));
    await recordAuditEvent(db, {
      actorId: ctx.user.id,
      resourceType: "admin-desk",
      resourceId: input.id,
      action: "desk-message-archived",
      previousState: { status: current.status },
      nextState: { status: "Arquivada" },
      detail: "Mensagem arquivada no Canal Ojú.",
    });
    return { success: true };
  }),

  unarchive: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = await loadDeskMessage(db, input.id);
    if (current.status !== "Arquivada") return { success: true };
    const status = current.reply?.trim() ? "Resolvida" : "Aberta";
    await db.update(adminDeskMessages).set({ status }).where(eq(adminDeskMessages.id, input.id));
    await recordAuditEvent(db, {
      actorId: ctx.user.id,
      resourceType: "admin-desk",
      resourceId: input.id,
      action: "desk-message-unarchived",
      previousState: { status: current.status },
      nextState: { status },
      detail: "Mensagem desarquivada no Canal Ojú.",
    });
    return { success: true };
  }),

  remove: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    confirmation: z.string().trim().min(1).max(180),
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = await loadDeskMessage(db, input.id);
    if (!confirmPhrasesMatch(current.subject, input.confirmation)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Digite o assunto da mensagem para confirmar a exclusão." });
    }
    await db.delete(adminDeskMessages).where(eq(adminDeskMessages.id, input.id));
    await recordAuditEvent(db, {
      actorId: ctx.user.id,
      resourceType: "admin-desk",
      resourceId: input.id,
      action: "desk-message-deleted",
      previousState: { status: current.status, subject: current.subject },
      detail: "Mensagem excluída do Canal Ojú.",
    });
    return { success: true };
  }),
});
