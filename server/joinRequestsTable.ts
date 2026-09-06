import { TRPCError } from "@trpc/server";
import type mysql from "mysql2";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

let ensured = false;

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS \`adminJoinRequests\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`name\` varchar(180) NOT NULL,
  \`email\` varchar(320) NOT NULL,
  \`whatsapp\` varchar(40) NOT NULL,
  \`territoryText\` varchar(240) NOT NULL,
  \`practice\` enum('Fotografia','Vídeo','Produção territorial','Casa ou coletivo','Outro') NOT NULL,
  \`message\` text NOT NULL,
  \`status\` enum('Recebida','Em conversa','Aprovada','Recusada','Arquivada') NOT NULL DEFAULT 'Recebida',
  \`reviewNote\` text,
  \`reviewedBy\` int,
  \`reviewedAt\` timestamp NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`join_request_status_idx\` (\`status\`, \`createdAt\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

function isMissingTable(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${error}` : String(error);
  return /doesn't exist|ER_NO_SUCH_TABLE|Unknown table|Failed query: select `id` from `adminJoinRequests`/i.test(text);
}

export function resetAdminJoinRequestsTableCache() {
  ensured = false;
}

export async function ensureAdminJoinRequestsTable(db: Db) {
  if (ensured) return;
  await (db.$client as mysql.Pool).promise().query(CREATE_SQL);
  ensured = true;
}

export function hideJoinRequestSql(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  console.error("[joinRequests]", error);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Não foi possível registrar o pedido agora. Tente de novo ou fale com a Ojú pelo WhatsApp.",
  });
}

export function shouldRetryJoinRequestSetup(error: unknown) {
  return isMissingTable(error);
}

export const publicJoinEmail = (value: string) => value.trim().toLowerCase();

export function isPublicJoinEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(publicJoinEmail(value));
}
