import { TRPCError } from "@trpc/server";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function ensureCoverageOfferDeclinesTable(_db: Db) {
  /* no-op: coverageOfferDeclines é gerida pela migration 0048. Sem CREATE em runtime. */
}

export function hideCoverageOfferSql(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  console.error("[coverageOffers]", error);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Não foi possível atualizar o pedido de cobertura agora.",
  });
}
