import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

function isOperableAccount(user: NonNullable<TrpcContext["user"]>) {
  return !user.accountStatus || user.accountStatus === "Ativo";
}

const requireAuthenticated = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user || !isOperableAccount(ctx.user)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const requireCmsAccess = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user || ctx.user.adminAccess === false || !isOperableAccount(ctx.user)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/** Conta autenticada e ativa. Não exige adminAccess nem gov.br. */
export const authenticatedProcedure = t.procedure.use(requireAuthenticated);

/** Centro Administrativo: sessão + adminAccess. Assinatura gov.br não é este gate. */
export const protectedProcedure = t.procedure.use(requireCmsAccess);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.adminAccess === false || !isOperableAccount(ctx.user) || !['administrador', 'administrador principal'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
