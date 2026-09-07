import { and, desc, eq, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminJoinRequests } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  ensureAdminJoinRequestsTable,
  hideJoinRequestSql,
  isPublicJoinEmail,
  publicJoinEmail,
  resetAdminJoinRequestsTableCache,
  shouldRetryJoinRequestSetup,
} from "../joinRequestsTable";
import { decodeSpecialties, bondLabel, encodeSpecialties, specialtyIdsOf, resolveNetworkBond, networkBondNowIds } from "@shared/professionalSpecialties";
import { upsertProfessionalProfile } from "../professionalNetwork";
import { recordAuditEvent } from "../partnerScope";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

function mapJoinRows(rows: typeof adminJoinRequests.$inferSelect[]) {
  return rows.map(row => ({
    ...row,
    specialties: decodeSpecialties(row.practice),
    bondLabel: bondLabel(row.networkBond),
  }));
}

const statuses = ["Recebida", "Em conversa", "Aprovada", "Recusada", "Arquivada"] as const;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  await ensureAdminJoinRequestsTable(db);
  return db;
}

function requirePrincipal(role: string) {
  if (role !== "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "Somente a Equipe Ojú trata candidaturas a Parceiro Ojú." });
}

async function saveJoinRequest(input: {
  name: string;
  email: string;
  whatsapp: string;
  territoryText: string;
  practices: string[];
  message: string;
  hasOwnMedia?: boolean;
  mediaOutletName?: string | null;
  mediaOutletUrl?: string | null;
  networkBond?: string | null;
}) {
  const db = await requireDb();
  const email = publicJoinEmail(input.email);
  const specialtyIds = specialtyIdsOf(input.practices);
  const practice = encodeSpecialties(specialtyIds);
  if (!practice) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha ao menos uma especialidade: fotógrafo, videomaker, historymaker e as demais da Rede. Isso não libera o painel sozinho." });
  const hasOwnMedia = Boolean(input.hasOwnMedia);
  const networkBond = resolveNetworkBond({ hasOwnMedia, bond: input.networkBond });
  const recent = await db.select({ id: adminJoinRequests.id }).from(adminJoinRequests).where(and(
    eq(adminJoinRequests.email, email),
    or(eq(adminJoinRequests.status, "Recebida"), eq(adminJoinRequests.status, "Em conversa")),
  )).limit(1);
  if (recent[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "Já recebemos um pedido deste e-mail. A Ojú responde pelo WhatsApp ou e-mail informados." });
  await db.insert(adminJoinRequests).values({
    name: input.name,
    email,
    whatsapp: input.whatsapp,
    territoryText: input.territoryText,
    practice,
    networkBond,
    hasOwnMedia,
    mediaOutletName: input.mediaOutletName?.trim() || null,
    mediaOutletUrl: input.mediaOutletUrl?.trim() || null,
    message: input.message,
  });
  await upsertProfessionalProfile(db, {
    email,
    displayName: input.name,
    specialties: specialtyIds,
    hasOwnMedia,
    mediaOutletName: input.mediaOutletName,
    mediaOutletUrl: input.mediaOutletUrl,
    bond: networkBond,
    activate: false,
  });
  return { success: true as const };
}

export const joinRequestsRouter = router({
  submit: publicProcedure.input(z.object({
    name: z.string().trim().min(2).max(180),
    email: z.string().trim().max(320).refine(isPublicJoinEmail, "Informe um e-mail válido."),
    whatsapp: z.string().trim().min(8).max(40),
    territoryText: z.string().trim().min(2).max(240),
    practices: z.array(z.string().trim().min(2).max(80)).min(1).max(9),
    hasOwnMedia: z.boolean().optional(),
    mediaOutletName: z.string().trim().max(240).nullable().optional(),
    mediaOutletUrl: z.string().trim().max(320).nullable().optional(),
    networkBond: z.enum(networkBondNowIds).optional(),
    message: z.string().trim().min(10).max(4000),
  })).mutation(async ({ input }) => {
    try {
      return await saveJoinRequest(input);
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      if (shouldRetryJoinRequestSetup(error)) {
        resetAdminJoinRequestsTableCache();
        try {
          return await saveJoinRequest(input);
        } catch (retryError) {
          hideJoinRequestSql(retryError);
        }
      }
      hideJoinRequestSql(error);
    }
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    try {
      const db = await requireDb();
      const rows = await db.select().from(adminJoinRequests).orderBy(desc(adminJoinRequests.createdAt));
      const open = rows.filter(row => row.status === "Recebida" || row.status === "Em conversa").length;
      return { items: mapJoinRows(rows), open };
    } catch (error) {
      if (shouldRetryJoinRequestSetup(error)) {
        resetAdminJoinRequestsTableCache();
        try {
          const db = await requireDb();
          const rows = await db.select().from(adminJoinRequests).orderBy(desc(adminJoinRequests.createdAt));
          const open = rows.filter(row => row.status === "Recebida" || row.status === "Em conversa").length;
          return { items: mapJoinRows(rows), open };
        } catch (retryError) {
          hideJoinRequestSql(retryError);
        }
      }
      hideJoinRequestSql(error);
    }
  }),

  review: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    status: z.enum(statuses),
    reviewNote: z.string().max(2000).nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    try {
      const db = await requireDb();
      const current = (await db.select().from(adminJoinRequests).where(eq(adminJoinRequests.id, input.id)).limit(1))[0];
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Candidatura não encontrada." });
      await db.update(adminJoinRequests).set({
        status: input.status,
        reviewNote: input.reviewNote === undefined ? current.reviewNote : input.reviewNote,
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
      }).where(eq(adminJoinRequests.id, input.id));
      await recordAuditEvent(db, {
        actorId: ctx.user.id,
        resourceType: "join-request",
        resourceId: input.id,
        action: "join-request-reviewed",
        previousState: { status: current.status },
        nextState: { status: input.status },
        detail: "Equipe Ojú atualizou candidatura pública a Parceiro Ojú. Acesso ao painel só existe depois do convite em Colaboradores.",
      });
      return { success: true, email: current.email };
    } catch (error) {
      hideJoinRequestSql(error);
    }
  }),
});
