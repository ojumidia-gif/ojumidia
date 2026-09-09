/**
 * Leitura forense do QA. Sem DELETE. Não usar em Aiven.
 */
import { createConnection } from "mysql2/promise";
import { requireQaDatabaseUrl } from "./qaEnv";
import { parseMysqlUrl } from "../e2e/lib/qaTarget";

const databaseUrl = requireQaDatabaseUrl();
const target = parseMysqlUrl(databaseUrl);
if (!target) {
  console.error("DATABASE_URL QA inválida.");
  process.exit(1);
}
const withProtocol = databaseUrl.startsWith("mysql:") ? databaseUrl.replace(/^mysql:\/\//, "https://") : databaseUrl;
const parsed = new URL(withProtocol);
const connection = await createConnection({
  host: "127.0.0.1",
  port: Number(target.port),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: target.database,
});

try {
  const [events] = await connection.query(
    `SELECT id, actorId, partnerId, territoryId, resourceType, resourceId, action, previousState, nextState, detail, requestIp, userAgent, createdAt
     FROM auditEvents ORDER BY id`,
  );
  const [users] = await connection.query(`SELECT id, email, role, adminAccess, accountStatus, lastSignedIn FROM users`);
  const [notifs] = await connection.query(`SELECT COUNT(*) AS n FROM networkNotifications`);
  console.log(JSON.stringify({ auditEvents: events, users, networkNotifications: notifs }, null, 2));
} finally {
  await connection.end();
}
