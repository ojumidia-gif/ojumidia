import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { TERMS_OF_USE_DOCUMENT_CODE, TERMS_OF_USE_VERSION } from "@shared/legalVersions";
import { termsOfUseAcceptances, users } from "../drizzle/schema";
import type { getDb } from "./db";
import { recordAuditEvent } from "./partnerScope";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Actor = { id: number; email?: string | null; role: string };

export function currentTermsOfUse() {
  return { documentCode: TERMS_OF_USE_DOCUMENT_CODE, documentVersion: TERMS_OF_USE_VERSION };
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
}

export async function findCurrentTermsAcceptance(db: Db, input: { userId?: number | null; email?: string | null }) {
  const version = TERMS_OF_USE_VERSION;
  const email = normalizeEmail(input.email);
  if (input.userId) {
    const byUser = (await db.select().from(termsOfUseAcceptances).where(and(
      eq(termsOfUseAcceptances.userId, input.userId),
      eq(termsOfUseAcceptances.documentCode, TERMS_OF_USE_DOCUMENT_CODE),
      eq(termsOfUseAcceptances.documentVersion, version),
      eq(termsOfUseAcceptances.status, "vigente"),
    )).orderBy(desc(termsOfUseAcceptances.acceptedAt)).limit(1))[0];
    if (byUser) return byUser;
  }
  if (!email) return null;
  return (await db.select().from(termsOfUseAcceptances).where(and(
    eq(termsOfUseAcceptances.email, email),
    eq(termsOfUseAcceptances.documentCode, TERMS_OF_USE_DOCUMENT_CODE),
    eq(termsOfUseAcceptances.documentVersion, version),
    eq(termsOfUseAcceptances.status, "vigente"),
  )).orderBy(desc(termsOfUseAcceptances.acceptedAt)).limit(1))[0] ?? null;
}

export async function recordTermsOfUseAcceptance(db: Db, input: {
  userId?: number | null;
  email: string;
  context: string;
  requestIp?: string | null;
  userAgent?: string | null;
}) {
  const email = normalizeEmail(input.email);
  if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "O aceite dos Termos de Uso exige um e-mail identificável." });
  const existing = await findCurrentTermsAcceptance(db, { userId: input.userId, email });
  if (existing) {
    if (input.userId && !existing.userId) {
      await db.update(termsOfUseAcceptances).set({ userId: input.userId }).where(eq(termsOfUseAcceptances.id, existing.id));
      return { ...existing, userId: input.userId };
    }
    return existing;
  }
  await db.update(termsOfUseAcceptances).set({ status: "substituido" }).where(and(
    eq(termsOfUseAcceptances.email, email),
    eq(termsOfUseAcceptances.documentCode, TERMS_OF_USE_DOCUMENT_CODE),
    eq(termsOfUseAcceptances.status, "vigente"),
  ));
  const inserted = await db.insert(termsOfUseAcceptances).values({
    userId: input.userId ?? null,
    email,
    documentCode: TERMS_OF_USE_DOCUMENT_CODE,
    documentVersion: TERMS_OF_USE_VERSION,
    context: input.context.slice(0, 80),
    status: "vigente",
    requestIp: input.requestIp ?? null,
    userAgent: input.userAgent?.slice(0, 320) || null,
  });
  const id = Number(inserted[0].insertId);
  await recordAuditEvent(db, {
    actorId: input.userId ?? null,
    resourceType: "terms-of-use",
    resourceId: id,
    action: "terms-of-use-accepted",
    nextState: { documentCode: TERMS_OF_USE_DOCUMENT_CODE, documentVersion: TERMS_OF_USE_VERSION, context: input.context },
    detail: "Aceite versionado dos Termos de Uso. Não é assinatura digital gov.br nem autorização editorial.",
    requestIp: input.requestIp ?? null,
    userAgent: input.userAgent ?? null,
  });
  return (await db.select().from(termsOfUseAcceptances).where(eq(termsOfUseAcceptances.id, id)).limit(1))[0];
}

export async function bindTermsAcceptancesToUser(db: Db, input: { userId: number; email: string }) {
  const email = normalizeEmail(input.email);
  if (!email) return;
  const rows = await db.select().from(termsOfUseAcceptances).where(and(
    eq(termsOfUseAcceptances.email, email),
    eq(termsOfUseAcceptances.documentCode, TERMS_OF_USE_DOCUMENT_CODE),
  ));
  for (const row of rows) {
    if (!row.userId) await db.update(termsOfUseAcceptances).set({ userId: input.userId }).where(eq(termsOfUseAcceptances.id, row.id));
  }
}

export async function requireCurrentTermsOfUse(db: Db, actor: Actor) {
  if (actor.role === "administrador principal") return null;
  let email = actor.email;
  if (!email) {
    email = (await db.select({ email: users.email }).from(users).where(eq(users.id, actor.id)).limit(1))[0]?.email ?? undefined;
  }
  const accepted = await findCurrentTermsAcceptance(db, { userId: actor.id, email });
  if (!accepted) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Aceite a versão vigente dos Termos de Uso para operar a Rede. Isso não é assinatura gov.br nem acesso administrativo.",
    });
  }
  return accepted;
}

export function requestMeta(req: { ip?: string; headers?: Record<string, unknown> }) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : typeof forwarded === "string" ? forwarded.split(",")[0] : "";
  const userAgent = req.headers?.["user-agent"];
  return {
    requestIp: (forwardedValue || req.ip || "").toString().trim().slice(0, 64) || null,
    userAgent: typeof userAgent === "string" ? userAgent : null,
  };
}
