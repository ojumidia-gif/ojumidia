import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { TERMS_OF_USE_VERSION } from "@shared/legalVersions";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { authenticatedProcedure, publicProcedure, router } from "../_core/trpc";
import { currentTermsOfUse, findCurrentTermsAcceptance, recordTermsOfUseAcceptance, requestMeta } from "../termsOfUse";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

export const legalRouter = router({
  current: publicProcedure.query(async ({ ctx }) => {
    const current = currentTermsOfUse();
    if (!ctx.user) return { ...current, accepted: false, acceptedAt: null, context: null };
    const db = await requireDb();
    const row = await findCurrentTermsAcceptance(db, { userId: ctx.user.id, email: ctx.user.email });
    return {
      ...current,
      accepted: Boolean(row),
      acceptedAt: row?.acceptedAt ?? null,
      context: row?.context ?? null,
    };
  }),
  accept: authenticatedProcedure.input(z.object({
    documentVersion: z.literal(TERMS_OF_USE_VERSION),
    context: z.enum(["login", "reaccept", "network-operation"]).default("login"),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const email = ctx.user.email?.trim()
      || (await db.select({ email: users.email }).from(users).where(eq(users.id, ctx.user.id)).limit(1))[0]?.email?.trim();
    if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "A conta precisa de e-mail para registrar o aceite dos Termos." });
    const meta = requestMeta(ctx.req);
    const row = await recordTermsOfUseAcceptance(db, {
      userId: ctx.user.id,
      email,
      context: input.context,
      ...meta,
    });
    return { id: row.id, documentVersion: row.documentVersion, acceptedAt: row.acceptedAt };
  }),
});
