import { createConnection } from "mysql2/promise";
import { requireQaDatabaseUrl } from "./qaEnv";
import { parseMysqlUrl } from "../e2e/lib/qaTarget";

const PRODUCT_TABLES = [
  "users",
  "partners",
  "partnerMembers",
  "professionalProfiles",
  "commercialRequests",
  "networkOpportunities",
  "networkProductions",
  "mediaAssets",
  "publications",
  "networkProductionSettlements",
  "auditEvents",
  "networkNotifications",
  "adminJoinRequests",
  "collaboratorAccessGrants",
  "taxonomies",
  "communityCareRequests",
  "revenueLeads",
  "termsOfUseAcceptances",
  "networkVoices",
];

const REQUIRED_TABLES = [
  "__drizzle_migrations",
  ...PRODUCT_TABLES,
];

const databaseUrl = requireQaDatabaseUrl();
const target = parseMysqlUrl(databaseUrl);
if (!target) {
  console.error("DATABASE_URL QA inválida.");
  process.exit(1);
}

const withProtocol = databaseUrl.startsWith("mysql:") ? databaseUrl.replace(/^mysql:\/\//, "https://") : databaseUrl;
const parsed = new URL(withProtocol);

const connection = await createConnection({
  host: target.host === "localhost" ? "127.0.0.1" : target.host,
  port: Number(target.port),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: target.database,
});

try {
  const [tables] = await connection.query<{ Tables_in_oju_midia_qa?: string }[]>("SHOW TABLES");
  const names = (tables as Array<Record<string, string>>).map(row => Object.values(row)[0]);
  const missing = REQUIRED_TABLES.filter(name => !names.includes(name));
  if (missing.length) {
    console.error(`ABORTADO: tabelas ausentes no QA: ${missing.join(", ")}`);
    process.exit(1);
  }

  const [migrationRows] = await connection.query<{ n: number }[]>("SELECT COUNT(*) AS n FROM `__drizzle_migrations`");
  const migrationCount = Number((migrationRows as Array<{ n: number }>)[0]?.n ?? 0);
  console.log(`__drizzle_migrations: ${migrationCount}`);
  if (migrationCount < 57) {
    console.error(`ABORTADO: esperado journal 0000–0056 (57 entradas). Encontrado: ${migrationCount}.`);
    process.exit(1);
  }

  for (const table of PRODUCT_TABLES) {
    const [rows] = await connection.query<{ n: number }[]>(`SELECT COUNT(*) AS n FROM \`${table}\``);
    const count = Number((rows as Array<{ n: number }>)[0]?.n ?? 0);
    console.log(`${table}: ${count}`);
  }
} finally {
  await connection.end();
}
