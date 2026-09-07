import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { productionStatuses } from "@shared/networkProductions";
import {
  approveProductionReview,
  attachProductionMedia,
  createProductionFromAcceptedOpportunity,
  detachProductionMedia,
  getProduction,
  hideProductionSql,
  isMissingProductionSchema,
  linkProductionPublication,
  listProductions,
  markProductionDelivered,
  myProductions,
  submitProductionForReview,
  transitionProduction,
} from "../productions";
import {
  listSettlementsForAdmin,
  openProductionSettlement,
  setProductionPaymentStatus,
} from "../networkCommerce";
import { productionPaymentStatuses } from "@shared/networkOperations";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

export const productionsRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    try {
      return await myProductions(db, ctx.user);
    } catch (error) {
      if (isMissingProductionSchema(error)) return { profile: null, buckets: { planejadas: [], confirmadas: [], emProducao: [], aguardandoMidia: [], concluidas: [], encerradas: [] } };
      hideProductionSql(error);
    }
  }),
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    try {
      return await listProductions(db, ctx.user);
    } catch (error) {
      if (isMissingProductionSchema(error)) return [];
      hideProductionSql(error);
    }
  }),
  get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await getProduction(db, ctx.user, input.id);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  createFromOpportunity: protectedProcedure.input(z.object({ opportunityId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      const created = await createProductionFromAcceptedOpportunity(db, ctx.user, input.opportunityId);
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Produção ainda não está disponível neste ambiente." });
      return created;
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  transition: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    status: z.enum(productionStatuses),
    notes: z.string().trim().max(4000).nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await transitionProduction(db, ctx.user, input);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  attachMedia: protectedProcedure.input(z.object({
    productionId: z.number().int().positive(),
    mediaId: z.number().int().positive(),
    layer: z.enum(["Operacional", "Editorial"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await attachProductionMedia(db, ctx.user, input);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  detachMedia: protectedProcedure.input(z.object({ productionId: z.number().int().positive(), mediaId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await detachProductionMedia(db, ctx.user, input);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  submitForReview: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await submitProductionForReview(db, ctx.user, input.id);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  approveReview: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await approveProductionReview(db, ctx.user, input.id);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  markDelivered: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    mediaIds: z.array(z.number().int().positive()).max(6).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await markProductionDelivered(db, ctx.user, input.id, input.mediaIds);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  settlements: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    try {
      return await listSettlementsForAdmin(db, ctx.user);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  openSettlement: protectedProcedure.input(z.object({ productionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await openProductionSettlement(db, ctx.user, input.productionId);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  setPaymentStatus: protectedProcedure.input(z.object({
    productionId: z.number().int().positive(),
    paymentStatus: z.enum(productionPaymentStatuses),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await setProductionPaymentStatus(db, ctx.user, input);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
  linkPublication: protectedProcedure.input(z.object({ productionId: z.number().int().positive(), publicationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await linkProductionPublication(db, ctx.user, input);
    } catch (error) {
      hideProductionSql(error);
    }
  }),
});
