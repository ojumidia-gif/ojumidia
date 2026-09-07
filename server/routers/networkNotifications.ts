import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getMyNotificationPreferences,
  isMissingNotificationSchema,
  listMyNetworkNotifications,
  markNetworkNotificationRead,
  saveMyNotificationPreferences,
} from "../networkNotifications";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

export const networkNotificationsRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    try {
      return await listMyNetworkNotifications(db, ctx.user);
    } catch (error) {
      if (isMissingNotificationSchema(error)) return [];
      throw error;
    }
  }),
  markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    return markNetworkNotificationRead(db, ctx.user, input.id);
  }),
  preferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return getMyNotificationPreferences(db, ctx.user);
  }),
  savePreferences: protectedProcedure.input(z.object({
    inApp: z.boolean(),
    emailTransactional: z.boolean(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    return saveMyNotificationPreferences(db, ctx.user, input);
  }),
});
