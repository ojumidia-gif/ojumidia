import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { administratorResponsibilityTerms, collaboratorAccessGrants, mediaAssets, partnerMembers, publications, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { recordAuditEvent, syncPartnerMemberFromGrant } from "../partnerScope";
import { classifyAdminPulse } from "@shared/adminPulse";
import { formatAdminId, isAccountOperable, nextSessionEpoch } from "@shared/governance";
import { recordSecurityAlert } from "../governance";
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

const accountStatuses = ["Ativo", "Suspenso", "Bloqueado", "Revogado"] as const;

async function revokePartnerMemberships(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, status: "Suspenso" | "Revogado") {
  await db.update(partnerMembers).set({ status, revokedAt: new Date() }).where(eq(partnerMembers.userId, userId));
}

async function bumpSessionEpoch(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number) {
  const account = (await db.select({ sessionEpoch: users.sessionEpoch }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!account) return;
  await db.update(users).set({ sessionEpoch: nextSessionEpoch(account.sessionEpoch) }).where(eq(users.id, userId));
}

async function synchronizeGrantedAccountRole(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, grant: typeof collaboratorAccessGrants.$inferSelect) {
  if (!grant.userId) return;
  const account = (await db.select().from(users).where(eq(users.id, grant.userId)).limit(1))[0];
  const signedTerm = grant.role === "administrador"
    ? (await db.select().from(administratorResponsibilityTerms).where(and(eq(administratorResponsibilityTerms.grantId, grant.id), eq(administratorResponsibilityTerms.status, "Assinado via gov.br"))).limit(1))[0]
    : undefined;
  const operable = account ? isAccountOperable(account.accountStatus) : true;
  const isActive = operable && grant.status === "Autorizado" && (grant.role !== "administrador" || Boolean(signedTerm));
  await db.update(users).set({ role: isActive ? grant.role : (account?.role === "administrador principal" ? account.role : "criador"), adminAccess: isActive }).where(eq(users.id, grant.userId));
  if (isActive && grant.partnerId && grant.territoryId) {
    try {
      await syncPartnerMemberFromGrant(db, { userId: grant.userId, partnerId: grant.partnerId, territoryId: grant.territoryId, createdBy: grant.createdBy });
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível associar o colaborador ao território." });
    }
  } else if (grant.userId && grant.status === "Revogado") {
    await revokePartnerMemberships(db, grant.userId, "Revogado");
    await bumpSessionEpoch(db, grant.userId);
  }
}

export const collaboratorsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    requirePrincipal(ctx.user.role);
    const db = await requireDb();
    const [grants, accounts, terms] = await Promise.all([
      db.select().from(collaboratorAccessGrants).orderBy(desc(collaboratorAccessGrants.updatedAt)),
      db.select({ id: users.id, name: users.name, email: users.email, role: users.role, adminAccess: users.adminAccess, accountStatus: users.accountStatus, lastSignedIn: users.lastSignedIn, createdAt: users.createdAt }).from(users),
      db.select().from(administratorResponsibilityTerms).orderBy(desc(administratorResponsibilityTerms.createdAt)),
    ]);
    const accountsByEmail = new Map(accounts.filter(account => account.email).map(account => [normalizeEmail(account.email!), account]));
    const latestTermByGrant = new Map<number, typeof terms[number]>();
    terms.forEach(term => { if (!latestTermByGrant.has(term.grantId)) latestTermByGrant.set(term.grantId, term); });
    const superAdmins = accounts.filter(account => account.role === "administrador principal" && account.adminAccess);
    const userIds = grants.map(grant => grant.userId).filter((id): id is number => typeof id === "number");
    const pubRows = userIds.length ? await db.select({ createdBy: publications.createdBy }).from(publications).where(inArray(publications.createdBy, userIds)) : [];
    const mediaRows = userIds.length ? await db.select({ createdBy: mediaAssets.createdBy }).from(mediaAssets).where(inArray(mediaAssets.createdBy, userIds)) : [];
    const publicationCount = new Map<number, number>();
    const mediaCount = new Map<number, number>();
    for (const row of pubRows) {
      if (!row.createdBy) continue;
      publicationCount.set(row.createdBy, (publicationCount.get(row.createdBy) || 0) + 1);
    }
    for (const row of mediaRows) {
      if (!row.createdBy) continue;
      mediaCount.set(row.createdBy, (mediaCount.get(row.createdBy) || 0) + 1);
    }
    return {
      superAdmins: superAdmins.map(account => ({ ...account, adminId: formatAdminId(account.id) })),
      grants: grants.map(grant => {
        const term = latestTermByGrant.get(grant.id);
        const safeTerm = term ? (() => { const { signedDocumentUrl: _signedDocumentUrl, signedStorageKey: _signedStorageKey, ...safe } = term; return { ...safe, hasSignedDocument: Boolean(_signedDocumentUrl && _signedStorageKey) }; })() : null;
        const account = accountsByEmail.get(normalizeEmail(grant.email)) ?? null;
        const pubs = account ? publicationCount.get(account.id) || 0 : 0;
        const media = account ? mediaCount.get(account.id) || 0 : 0;
        const pulse = classifyAdminPulse({
          grantStatus: grant.status,
          lastSignedIn: account?.lastSignedIn,
          publicationCount: pubs,
          mediaCount: media,
        });
        return { ...grant, account: account ? { ...account, adminId: formatAdminId(account.id) } : null, responsibilityTerm: safeTerm, publicationCount: pubs, mediaCount: media, pulse, adminId: account ? formatAdminId(account.id) : null };
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
    if (normalizeEmail(ctx.user.email || "") === email) throw new TRPCError({ code: "FORBIDDEN", message: "Não é permitido alterar o próprio escopo ou permissões por esta via." });
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
    if (grant.userId && grant.userId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Não é permitido alterar o próprio escopo ou permissões." });
    if (normalizeEmail(grant.email) === normalizeEmail(ctx.user.email || "")) throw new TRPCError({ code: "FORBIDDEN", message: "Não é permitido alterar o próprio escopo ou permissões." });
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
  setAccountStatus: protectedProcedure.input(z.object({
    userId: z.number().int().positive(),
    status: z.enum(accountStatuses),
    reason: z.string().min(3).max(2000),
    caseId: z.number().int().positive().nullable().optional(),
    until: z.string().datetime().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    requirePrincipal(ctx.user.role);
    if (input.userId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "O Super Admin não pode suspender ou revogar a própria conta por esta via." });
    const db = await requireDb();
    const account = (await db.select().from(users).where(eq(users.id, input.userId)).limit(1))[0];
    if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada." });
    if (account.role === "administrador principal") throw new TRPCError({ code: "FORBIDDEN", message: "A Equipe Ojú / Super Admin não pode ser suspensa por este painel." });
    const previous = account.accountStatus;
    await db.update(users).set({
      accountStatus: input.status,
      accountStatusReason: input.reason,
      accountStatusChangedAt: new Date(),
      accountStatusChangedBy: ctx.user.id,
      accountStatusCaseId: input.caseId ?? null,
      accountStatusUntil: input.until ? new Date(input.until) : null,
      adminAccess: input.status === "Ativo" ? account.adminAccess : false,
    }).where(eq(users.id, account.id));
    if (input.status !== "Ativo") await bumpSessionEpoch(db, account.id);
    const grant = account.email ? (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.email, normalizeEmail(account.email))).limit(1))[0] : undefined;
    if (grant) {
      if (input.status === "Revogado") await db.update(collaboratorAccessGrants).set({ status: "Revogado" }).where(eq(collaboratorAccessGrants.id, grant.id));
      if (input.status === "Ativo") await db.update(collaboratorAccessGrants).set({ status: "Autorizado" }).where(eq(collaboratorAccessGrants.id, grant.id));
      const updatedGrant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, grant.id)).limit(1))[0];
      if (updatedGrant) await synchronizeGrantedAccountRole(db, updatedGrant);
    }
    if (input.status === "Suspenso") await revokePartnerMemberships(db, account.id, "Suspenso");
    if (input.status === "Bloqueado" || input.status === "Revogado") await revokePartnerMemberships(db, account.id, "Revogado");
    const action = input.status === "Ativo" ? "admin-reactivated" : input.status === "Suspenso" ? "admin-suspended" : input.status === "Bloqueado" ? "admin-blocked" : "admin-revoked";
    await recordAuditEvent(db, {
      actorId: ctx.user.id,
      resourceType: "user",
      resourceId: account.id,
      action,
      previousState: { accountStatus: previous, adminId: formatAdminId(account.id) },
      nextState: { accountStatus: input.status, caseId: input.caseId ?? null, until: input.until ?? null },
      detail: input.reason,
    });
    await recordSecurityAlert(db, {
      kind: "alteracao-permissao",
      title: `${formatAdminId(account.id)} → ${input.status}`,
      detail: input.reason,
      actorUserId: ctx.user.id,
      subjectUserId: account.id,
      caseId: input.caseId ?? null,
      severity: input.status === "Ativo" ? "info" : "alerta",
    });
    return { success: true, adminId: formatAdminId(account.id) };
  }),
});
