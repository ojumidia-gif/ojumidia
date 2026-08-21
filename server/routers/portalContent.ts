import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { portalContentActivities, portalContentBlocks, portalContentPages } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const pageInput = z.enum(portalContentPages);
const blockInput = z.object({
  id: z.number().int().positive().optional(),
  page: pageInput,
  sectionKey: z.string().trim().min(2).max(120),
  label: z.string().trim().min(2).max(240),
  contentJson: z.string().min(2).max(30000),
  isVisible: z.boolean(),
  displayOrder: z.number().int().min(0).max(999),
});

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

export function canManagePortalContent(role: string) {
  return role === "administrador principal";
}

function requirePrincipal(role: string) {
  if (!canManagePortalContent(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Super Admin pode alterar o conteúdo institucional do portal." });
}

function validateJson(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object expected");
    return JSON.stringify(parsed);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "O conteúdo institucional precisa ter uma estrutura válida." });
  }
}

async function recordActivity(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, blockId: number | null, action: (typeof portalContentActivities.$inferInsert)["action"], snapshot: string, actorId: number) {
  await db.insert(portalContentActivities).values({ blockId, action, snapshot, actorId });
}

export const portalContentRouter = router({
  publicByPage: publicProcedure.input(z.object({ page: pageInput })).query(async ({ input }) => {
    const db = await requireDb();
    const blocks = await db.select().from(portalContentBlocks)
      .where(eq(portalContentBlocks.page, input.page))
      .orderBy(asc(portalContentBlocks.displayOrder), asc(portalContentBlocks.id));
    return blocks.map(block => ({
      id: block.id,
      sectionKey: block.sectionKey,
      contentJson: block.deletedAt ? null : block.contentJson,
      isVisible: block.isVisible,
      deletedAt: block.deletedAt,
      displayOrder: block.displayOrder,
    }));
  }),

  adminList: protectedProcedure.query(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    return db.select().from(portalContentBlocks).orderBy(asc(portalContentBlocks.page), asc(portalContentBlocks.displayOrder), asc(portalContentBlocks.id));
  }),

  activities: protectedProcedure.input(z.object({ blockId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    return db.select().from(portalContentActivities).where(eq(portalContentActivities.blockId, input.blockId)).orderBy(desc(portalContentActivities.createdAt)).limit(20);
  }),

  save: protectedProcedure.input(blockInput).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const contentJson = validateJson(input.contentJson);
    const values = { page: input.page, sectionKey: input.sectionKey, label: input.label, contentJson, isVisible: input.isVisible, displayOrder: input.displayOrder, updatedBy: ctx.user.id, deletedAt: null };
    if (input.id) {
      const current = (await db.select().from(portalContentBlocks).where(eq(portalContentBlocks.id, input.id)).limit(1))[0];
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Bloco de conteúdo não encontrado." });
      await db.update(portalContentBlocks).set(values).where(eq(portalContentBlocks.id, input.id));
      await recordActivity(db, input.id, "Atualizado", JSON.stringify(values), ctx.user.id);
      return { id: input.id, created: false };
    }
    const duplicate = (await db.select({ id: portalContentBlocks.id }).from(portalContentBlocks).where(and(eq(portalContentBlocks.page, input.page), eq(portalContentBlocks.sectionKey, input.sectionKey))).limit(1))[0];
    if (duplicate) throw new TRPCError({ code: "CONFLICT", message: "Já existe um bloco com esta chave nesta página." });
    const result = await db.insert(portalContentBlocks).values({ ...values, createdBy: ctx.user.id });
    const id = Number(result[0].insertId);
    await recordActivity(db, id, "Criado", JSON.stringify(values), ctx.user.id);
    return { id, created: true };
  }),

  setVisibility: protectedProcedure.input(z.object({ id: z.number().int().positive(), isVisible: z.boolean() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(portalContentBlocks).where(eq(portalContentBlocks.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Bloco de conteúdo não encontrado." });
    await db.update(portalContentBlocks).set({ isVisible: input.isVisible, updatedBy: ctx.user.id }).where(eq(portalContentBlocks.id, input.id));
    await recordActivity(db, input.id, "Visibilidade", JSON.stringify({ isVisible: input.isVisible }), ctx.user.id);
    return { success: true };
  }),

  remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(portalContentBlocks).where(eq(portalContentBlocks.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Bloco de conteúdo não encontrado." });
    await db.update(portalContentBlocks).set({ isVisible: false, deletedAt: new Date(), updatedBy: ctx.user.id }).where(eq(portalContentBlocks.id, input.id));
    await recordActivity(db, input.id, "Excluído", JSON.stringify({ label: current.label, contentJson: current.contentJson }), ctx.user.id);
    return { success: true };
  }),

  restore: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const current = (await db.select().from(portalContentBlocks).where(eq(portalContentBlocks.id, input.id)).limit(1))[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Bloco de conteúdo não encontrado." });
    await db.update(portalContentBlocks).set({ isVisible: true, deletedAt: null, updatedBy: ctx.user.id }).where(eq(portalContentBlocks.id, input.id));
    await recordActivity(db, input.id, "Restaurado", JSON.stringify({ label: current.label }), ctx.user.id);
    return { success: true };
  }),
});
