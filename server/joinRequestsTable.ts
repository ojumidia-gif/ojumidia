import { TRPCError } from "@trpc/server";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export function resetAdminJoinRequestsTableCache() {
  /* schema agora vem da migration 0046/0049; não há cache de DDL */
}

export async function ensureAdminJoinRequestsTable(_db: Db) {
  /* no-op: adminJoinRequests é gerida por migration. Sem CREATE/ALTER em runtime. */
}

export function hideJoinRequestSql(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  console.error("[joinRequests]", error);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Não foi possível registrar o pedido agora. Tente de novo ou fale com a Ojú pelo WhatsApp.",
  });
}

export function shouldRetryJoinRequestSetup(_error: unknown) {
  return false;
}

export const publicJoinEmail = (value: string) => value.trim().toLowerCase();

export function isPublicJoinEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(publicJoinEmail(value));
}
