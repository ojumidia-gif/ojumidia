import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { professionalSpecialtyIds } from "@shared/professionalSpecialties";
import {
  getPublicPartnerBySlug,
  getPublicProfessionalBySlug,
  listDirectoryProfilesForAdmin,
  listPublicNetworkDirectory,
  setDirectoryProfileVisible,
} from "../networkDirectory";
import { hideProfessionalNetworkSql, isMissingProfessionalNetworkSchema } from "../professionalNetwork";
import { createProductionPayment, isMissingPaymentSchema, listPaymentsForProduction } from "../networkPayments";
import { getProduction } from "../productions";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

export const networkDirectoryRouter = router({
  publicList: publicProcedure.input(z.object({
    q: z.string().trim().max(180).optional(),
    territoryId: z.number().int().positive().optional(),
    specialtyId: z.enum(professionalSpecialtyIds).optional(),
    kind: z.enum(["profissional", "casa", "projeto", "parceiro"]).optional(),
    limit: z.number().int().min(1).max(48).optional(),
    offset: z.number().int().min(0).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    return listPublicNetworkDirectory(db, input || {});
  }),
  publicProfessional: publicProcedure.input(z.object({ slug: z.string().min(1).max(260) })).query(async ({ input }) => {
    const db = await requireDb();
    return getPublicProfessionalBySlug(db, input.slug);
  }),
  publicPartner: publicProcedure.input(z.object({ slug: z.string().min(1).max(260) })).query(async ({ input }) => {
    const db = await requireDb();
    return getPublicPartnerBySlug(db, input.slug);
  }),
  adminProfiles: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    try {
      return await listDirectoryProfilesForAdmin(db, ctx.user);
    } catch (error) {
      if (isMissingProfessionalNetworkSchema(error)) return [];
      hideProfessionalNetworkSql(error);
    }
  }),
  setVisible: protectedProcedure.input(z.object({
    profileId: z.number().int().positive(),
    publicVisible: z.boolean(),
    publicBio: z.string().trim().max(2000).nullable().optional(),
    publicContact: z.string().trim().max(320).nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await setDirectoryProfileVisible(db, ctx.user, input);
    } catch (error) {
      hideProfessionalNetworkSql(error);
    }
  }),
  createPayment: protectedProcedure.input(z.object({
    productionId: z.number().int().positive(),
    amount: z.number().positive().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await createProductionPayment(db, ctx.user, input);
    } catch (error) {
      if (isMissingPaymentSchema(error)) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Cobrança ainda não está disponível neste ambiente." });
      throw error;
    }
  }),
  paymentsForProduction: protectedProcedure.input(z.object({ productionId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    await getProduction(db, ctx.user, input.productionId);
    return listPaymentsForProduction(db, ctx.user, input.productionId);
  }),
});
