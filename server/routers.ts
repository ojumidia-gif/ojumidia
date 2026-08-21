import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { editorialRouter } from "./routers/editorial";
import { mediaRouter } from "./routers/media";
import { commercialRouter } from "./routers/commercial";
import { revenueRouter } from "./routers/revenue";
import { communityRouter } from "./routers/community";
import { collaboratorsRouter } from "./routers/collaborators";
import { financialRouter } from "./routers/financial";
import { networkRouter } from "./routers/network";
import { portalContentRouter } from "./routers/portalContent";
import { partnersRouter } from "./routers/partners";
import { operationsRouter } from "./routers/operations";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  editorial: editorialRouter,
  media: mediaRouter,
  commercial: commercialRouter,
  revenue: revenueRouter,
  community: communityRouter,
  collaborators: collaboratorsRouter,
  financial: financialRouter,
  network: networkRouter,
  portalContent: portalContentRouter,
  partners: partnersRouter,
  operations: operationsRouter,
});

export type AppRouter = typeof appRouter;
