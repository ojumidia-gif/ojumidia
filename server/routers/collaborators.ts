import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { administratorResponsibilityTerms, collaboratorAccessGrants, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { recordAuditEvent, syncPartnerMemberFromGrant } from "../partnerScope";
import { protectedProcedure, router } from "../_core/trpc";

const collaboratorRoles = ["criador", "editor", "aprovador", "administrador"] as const;
const grantStatuses = ["Autorizado", "Revogado"] as const;
const COMMERCIAL_CONTACT_EMAIL = "ojumidia@gmail.com";
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const scopeInput = {
  partnerId: z.number().int().positive().nullable().optional(),
  territoryId: z.number().int().positive().nullable().optional(),
};

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

function requirePrincipal(role: string) {
  if (role !== "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "Somente o administrador principal pode gerenciar colaboradores." });
}

function assertGrantScope(role: (typeof collaboratorRoles)[number], partnerId?: number | null, territoryId?: number | null) {
  if (role === "administrador" && (!partnerId || !territoryId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Administrador territorial precisa de Parceiro Ojú e território definidos antes de operar conteúdo." });
  }
  if ((partnerId && !territoryId) || (!partnerId && territoryId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Parceiro e território devem ser informados juntos." });
  }
}

async function synchronizeGrantedAccountRole(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, grant: typeof collaboratorAccessGrants.$inferSelect) {
  if (!grant.userId) return;
  const signedTerm = grant.role === "administrador"
    ? (await db.select().from(administratorResponsibilityTerms).where(and(eq(administratorResponsibilityTerms.grantId, grant.id), eq(administratorResponsibilityTerms.status, "Assinado via gov.br"))).limit(1))[0]
    : undefined;
  const isActive = grant.status === "Autorizado" && (grant.role !== "administrador" || Boolean(signedTerm));
  await db.update(users).set({ role: isActive ? grant.role : "criador", adminAccess: isActive }).where(eq(users.id, grant.userId));
  if (isActive && grant.partnerId && grant.territoryId) {
    try {
      await syncPartnerMemberFromGrant(db, { userId: grant.userId, partnerId: grant.partnerId, territoryId: grant.territoryId, createdBy: grant.createdBy });
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível associar o colaborador ao território." });
    }
  }
}

export const collaboratorsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const [grants, accounts, terms] = await Promise.all([
      db.select().from(collaboratorAccessGrants).orderBy(desc(collaboratorAccessGrants.updatedAt)),
      db.select({ id: users.id, name: users.name, email: users.email, role: users.role, adminAccess: users.adminAccess, lastSignedIn: users.lastSignedIn }).from(users),
      db.select().from(administratorResponsibilityTerms).orderBy(desc(administratorResponsibilityTerms.createdAt)),
    ]);
    const accountsByEmail = new Map(accounts.filter(account => account.email).map(account => [normalizeEmail(account.email!), account]));
    const latestTermByGrant = new Map<number, typeof terms[number]>();
    terms.forEach(term => { if (!latestTermByGrant.has(term.grantId)) latestTermByGrant.set(term.grantId, term); });
    const superAdmins = accounts.filter(account => account.role === "administrador principal" && account.adminAccess);
    return {
      superAdmins,
      grants: grants.map(grant => {
        const term = latestTermByGrant.get(grant.id);
        const safeTerm = term ? (() => { const { signedDocumentUrl: _signedDocumentUrl, signedStorageKey: _signedStorageKey, ...safe } = term; return { ...safe, hasSignedDocument: Boolean(_signedDocumentUrl && _signedStorageKey) }; })() : null;
        return { ...grant, account: accountsByEmail.get(normalizeEmail(grant.email)) ?? null, responsibilityTerm: safeTerm };
      }),
    };
  }),
  authorize: protectedProcedure.input(z.object({
    email: z.string().email().max(320),
    displayName: z.string().max(240).nullable().optional(),
    role: z.enum(collaboratorRoles),
    note: z.string().max(3000).nullable().optional(),
    ...scopeInput,
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const email = normalizeEmail(input.email);
    if (email === COMMERCIAL_CONTACT_EMAIL) throw new TRPCError({ code: "BAD_REQUEST", message: "O e-mail comercial da Ojú não pode receber autorização administrativa." });
    assertGrantScope(input.role, input.partnerId, input.territoryId);
    const existing = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.email, email)).limit(1))[0];
    const values = { email, displayName: input.displayName ?? null, role: input.role, note: input.note ?? null, status: "Autorizado" as const, createdBy: ctx.user.id, partnerId: input.partnerId ?? null, territoryId: input.territoryId ?? null };
    let grantId: number;
    if (existing) {
      await db.update(collaboratorAccessGrants).set({ displayName: values.displayName, role: values.role, note: values.note, status: values.status, partnerId: values.partnerId, territoryId: values.territoryId }).where(eq(collaboratorAccessGrants.id, existing.id));
      grantId = existing.id;
    } else {
      const result = await db.insert(collaboratorAccessGrants).values(values);
      grantId = Number(result[0].insertId);
    }
    const account = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (account) await db.update(collaboratorAccessGrants).set({ userId: account.id }).where(eq(collaboratorAccessGrants.id, grantId));
    const grant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, grantId)).limit(1))[0];
    if (grant) await synchronizeGrantedAccountRole(db, grant);
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId: input.partnerId ?? null, territoryId: input.territoryId ?? null, resourceType: "collaborator-grant", resourceId: grantId, action: "collaborator-authorized", previousState: existing ? { role: existing.role, status: existing.status } : null, nextState: { email, role: input.role, status: "Autorizado", partnerId: input.partnerId ?? null, territoryId: input.territoryId ?? null }, detail: "Super Admin autorizou colaborador com papel e escopo. Administrador principal não é delegável." });
    return { id: grantId, requiresResponsibilityTerm: input.role === "administrador" };
  }),
  update: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    role: z.enum(collaboratorRoles).optional(),
    status: z.enum(grantStatuses).optional(),
    note: z.string().max(3000).nullable().optional(),
    ...scopeInput,
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const grant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, input.id)).limit(1))[0];
    if (!grant) throw new TRPCError({ code: "NOT_FOUND", message: "Autorização de colaborador não encontrada." });
    const role = input.role ?? grant.role;
    const partnerId = input.partnerId === undefined ? grant.partnerId : input.partnerId;
    const territoryId = input.territoryId === undefined ? grant.territoryId : input.territoryId;
    assertGrantScope(role, partnerId, territoryId);
    await db.update(collaboratorAccessGrants).set({ role, status: input.status ?? grant.status, note: input.note === undefined ? grant.note : input.note, partnerId, territoryId }).where(eq(collaboratorAccessGrants.id, grant.id));
    const updatedGrant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, grant.id)).limit(1))[0];
    if (updatedGrant) await synchronizeGrantedAccountRole(db, updatedGrant);
    await recordAuditEvent(db, { actorId: ctx.user.id, partnerId, territoryId, resourceType: "collaborator-grant", resourceId: grant.id, action: input.status === "Revogado" ? "collaborator-revoked" : "collaborator-updated", previousState: { role: grant.role, status: grant.status, partnerId: grant.partnerId, territoryId: grant.territoryId }, nextState: { role: updatedGrant?.role, status: updatedGrant?.status, partnerId, territoryId }, detail: "Alteração de permissão ou território de colaborador pelo Super Admin." });
    return { success: true };
  }),
  createResponsibilityTerm: protectedProcedure.input(z.object({ grantId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const grant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, input.grantId)).limit(1))[0];
    if (!grant || grant.role !== "administrador") throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um administrador autorizado para gerar o termo de responsabilidade." });
    const result = await db.insert(administratorResponsibilityTerms).values({ grantId: grant.id, email: grant.email, status: "Aguardando assinatura gov.br", createdByUserId: ctx.user.id });
    return { id: Number(result[0].insertId), email: grant.email, displayName: grant.displayName, grant };
  }),
  attachSignedResponsibilityTerm: protectedProcedure.input(z.object({ id: z.number().int().positive(), signedDocumentUrl: z.string().min(2).max(2048), signedStorageKey: z.string().max(512).nullable().optional(), signedFilename: z.string().min(2).max(280), notes: z.string().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const term = (await db.select().from(administratorResponsibilityTerms).where(eq(administratorResponsibilityTerms.id, input.id)).limit(1))[0];
    if (!term) throw new TRPCError({ code: "NOT_FOUND", message: "Termo de responsabilidade não encontrado." });
    const grant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, term.grantId)).limit(1))[0];
    if (!grant || grant.status !== "Autorizado" || grant.role !== "administrador") throw new TRPCError({ code: "BAD_REQUEST", message: "A autorização administrativa não está ativa ou não exige este termo." });
    await db.update(administratorResponsibilityTerms).set({ status: "Assinado via gov.br", signedDocumentUrl: input.signedDocumentUrl, signedStorageKey: input.signedStorageKey ?? null, signedFilename: input.signedFilename, signedAt: new Date(), uploadedByUserId: ctx.user.id, notes: input.notes?.trim() || null }).where(eq(administratorResponsibilityTerms.id, term.id));
    await synchronizeGrantedAccountRole(db, grant);
    return { success: true };
  }),
});
