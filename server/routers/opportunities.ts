import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { protectedProcedure, authenticatedProcedure, router } from "../_core/trpc";
import { requireCurrentTermsOfUse } from "../termsOfUse";
import { opportunityWorkTypes } from "@shared/networkOpportunities";
import { professionalSpecialtyIds } from "@shared/professionalSpecialties";
import {
  acceptOpportunityInvite,
  cancelNetworkOpportunity,
  createNetworkOpportunity,
  createOpportunityFromCommercialRequest,
  declineOpportunityInvite,
  eligibleProfessionals,
  hideOpportunitySql,
  inviteToOpportunity,
  isMissingOpportunitySchema,
  listOpportunitiesForAdmin,
  matchProfessionalsForOpportunity,
  myOpportunityInvites,
  updateNetworkOpportunity,
} from "../opportunities";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

const money = z.number().positive().max(99999999);

export const opportunitiesRouter = router({
  mine: authenticatedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    try {
      return await myOpportunityInvites(db, ctx.user);
    } catch (error) {
      if (isMissingOpportunitySchema(error)) return { profile: null, buckets: { disponiveis: [], aceitas: [], recusadas: [], expiradas: [] } };
      hideOpportunitySql(error);
    }
  }),
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    try {
      return await listOpportunitiesForAdmin(db, ctx.user);
    } catch (error) {
      if (isMissingOpportunitySchema(error)) return [];
      hideOpportunitySql(error);
    }
  }),
  match: protectedProcedure.input(z.object({ opportunityId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await matchProfessionalsForOpportunity(db, ctx.user, input.opportunityId);
    } catch (error) {
      hideOpportunitySql(error);
    }
  }),
  eligible: protectedProcedure.input(z.object({ opportunityId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await eligibleProfessionals(db, ctx.user, input.opportunityId);
    } catch (error) {
      hideOpportunitySql(error);
    }
  }),
  create: protectedProcedure.input(z.object({
    commercialRequestId: z.number().int().positive().nullable().optional(),
    title: z.string().trim().min(3).max(240),
    briefing: z.string().trim().min(10).max(8000),
    workType: z.enum(opportunityWorkTypes),
    territoryId: z.number().int().positive(),
    partnerId: z.number().int().positive().nullable().optional(),
    eventDate: z.date().nullable().optional(),
    startAt: z.date().nullable().optional(),
    endAt: z.date().nullable().optional(),
    durationText: z.string().trim().max(120).nullable().optional(),
    totalValue: money,
    specialtyIds: z.array(z.enum(professionalSpecialtyIds)).min(1).max(9),
    acceptanceDeadline: z.date().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await createNetworkOpportunity(db, ctx.user, input);
    } catch (error) {
      hideOpportunitySql(error);
    }
  }),
  createFromRequest: protectedProcedure.input(z.object({
    requestId: z.number().int().positive(),
    totalValue: money,
    partnerId: z.number().int().positive().nullable().optional(),
    acceptanceDeadline: z.date().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await createOpportunityFromCommercialRequest(db, ctx.user, input);
    } catch (error) {
      hideOpportunitySql(error);
    }
  }),
  update: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    title: z.string().trim().min(3).max(240).optional(),
    briefing: z.string().trim().min(10).max(8000).optional(),
    eventDate: z.date().nullable().optional(),
    startAt: z.date().nullable().optional(),
    endAt: z.date().nullable().optional(),
    durationText: z.string().trim().max(120).nullable().optional(),
    totalValue: money.optional(),
    specialtyIds: z.array(z.enum(professionalSpecialtyIds)).min(1).max(9).optional(),
    acceptanceDeadline: z.date().nullable().optional(),
    status: z.enum(["Rascunho", "Aberta"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await updateNetworkOpportunity(db, ctx.user, input);
    } catch (error) {
      hideOpportunitySql(error);
    }
  }),
  cancel: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await cancelNetworkOpportunity(db, ctx.user, input.id);
    } catch (error) {
      hideOpportunitySql(error);
    }
  }),
  invite: protectedProcedure.input(z.object({
    opportunityId: z.number().int().positive(),
    professionalProfileId: z.number().int().positive(),
    expiresAt: z.date().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      return await inviteToOpportunity(db, ctx.user, input);
    } catch (error) {
      hideOpportunitySql(error);
    }
  }),
  accept: authenticatedProcedure.input(z.object({ inviteId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      await requireCurrentTermsOfUse(db, ctx.user);
      return await acceptOpportunityInvite(db, ctx.user, input.inviteId);
    } catch (error) {
      hideOpportunitySql(error);
    }
  }),
  decline: authenticatedProcedure.input(z.object({ inviteId: z.number().int().positive(), reason: z.string().trim().max(480).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    try {
      await requireCurrentTermsOfUse(db, ctx.user);
      return await declineOpportunityInvite(db, ctx.user, input.inviteId, input.reason);
    } catch (error) {
      hideOpportunitySql(error);
    }
  }),
});
