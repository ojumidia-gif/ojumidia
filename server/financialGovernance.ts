import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { advertisements, commercialPayoutNotifications, commercialPolicies, institutionVisibilitySubscriptions, users } from "../drizzle/schema";
import { getDb } from "./db";

export const policyScopes = ["Visibilidade institucional", "Anúncio", "Cobertura", "Documentário", "Fotografia", "Outro"] as const;
export type PolicyScope = typeof policyScopes[number];

export async function requireFinancialDb() { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." }); return db; }
export const isPrincipalFinancial = (role: string) => role === "administrador principal";
export function requireFinancialAccess(role: string) { if (!["administrador", "administrador principal"].includes(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso financeiro não autorizado." }); }
export function requireFinancialPrincipal(role: string) { if (!isPrincipalFinancial(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o administrador principal gerencia políticas e repasses." }); }
export function money(value: number) { return Math.round(value * 100) / 100; }

export async function activeCommercialPolicy(db: Awaited<ReturnType<typeof requireFinancialDb>>, scope: PolicyScope, now = new Date()) {
  return (await db.select().from(commercialPolicies).where(and(eq(commercialPolicies.scope, scope), eq(commercialPolicies.status, "Ativa"), lte(commercialPolicies.effectiveAt, now))).orderBy(desc(commercialPolicies.version)).limit(1))[0] ?? null;
}

export async function createPayoutNotification(db: Awaited<ReturnType<typeof requireFinancialDb>>, input: { recipientUserId: number; sourceType: "Anúncio" | "Visibilidade institucional"; sourceId: number; title: string; message: string; createdByUserId: number }) {
  await db.insert(commercialPayoutNotifications).values({ ...input, payoutStatus: "Pago" });
}

export function payoutBreakdown(items: Array<{ amount: number; status: "Pendente" | "Parcial" | "Pago" }>) {
  return items.reduce((summary, item) => { summary.expected += item.amount; if (item.status === "Pago") summary.paid += item.amount; else if (item.status === "Parcial") summary.partial += item.amount; else summary.pending += item.amount; return summary; }, { expected: 0, paid: 0, partial: 0, pending: 0 });
}
