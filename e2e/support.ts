import { expect, type APIRequestContext, type Page, type Response } from "@playwright/test";
import superjson from "superjson";
import { mutationGuardFromProcessEnv } from "./lib/envGuard";
import { assertReadSafeProcedure, isWriteOnReadQuery } from "./lib/writeOnRead";

const WRITE_PROCEDURES = [
  "requestCoverage",
  "originateLead",
  "joinRequests.submit",
  "recordHomeMiniclipSignal",
  "auth.logout",
  "createExecutor",
  "createCase",
  "createPayment",
  "createProduction",
  "joinRequests.",
  "markRead",
  "savePreferences",
  "setVisibility",
  "setFeatured",
  "attachMedia",
  "detachMedia",
  "advanceStatus",
  "publishDirect",
  "schedulePublish",
  "suggestHighlight",
  "purgeTrash",
  "requestRefund",
  "recordCharge",
  "declineRegionalOffer",
  "desk.send",
];

const WRITE_PROCEDURE_PATTERN =
  /(^|,)[a-zA-Z]+\.(create|update|save|delete|remove|restore|purge|assign|attach|detach|submit|publish|archive|activate|decide|record)/;

const WRITE_PATHS = ["/api/local-dev/login", "/api/upload", "/api/storage", "/api/auth/google/start"];

export type PageWatch = {
  pageErrors: string[];
  criticalApiFailures: string[];
  persistentWrites: string[];
  writeOnReadQueries: string[];
};

export function attachReadOnlyGuards(page: Page): PageWatch {
  const watch: PageWatch = { pageErrors: [], criticalApiFailures: [], persistentWrites: [], writeOnReadQueries: [] };

  page.on("pageerror", error => {
    watch.pageErrors.push(error.message);
  });

  page.on("request", request => {
    const url = request.url();
    const method = request.method();
    if (WRITE_PATHS.some(path => url.includes(path))) {
      watch.persistentWrites.push(`${method} ${url}`);
      return;
    }
    if (method === "PUT" || method === "PATCH" || method === "DELETE") {
      watch.persistentWrites.push(`${method} ${url}`);
      return;
    }
    if (method === "GET" && url.includes("/api/trpc")) {
      const procedures = trpcProceduresFromUrl(url);
      const hits = procedures.filter(proc => isWriteOnReadQuery(proc));
      if (hits.length) watch.writeOnReadQueries.push(`${method} ${url} (${hits.join(",")})`);
    }
    if (method !== "POST") return;
    if (!url.includes("/api/trpc")) return;
    const procedures = trpcProceduresFromUrl(url);
    const joined = procedures.join(",");
    const body = request.postData() || "";
    const hit =
      WRITE_PROCEDURES.find(name => procedures.some(proc => proc.includes(name)) || body.includes(name)) ||
      (WRITE_PROCEDURE_PATTERN.test(joined) ? joined : undefined);
    if (hit) watch.persistentWrites.push(`${method} ${url} (${hit})`);
  });

  page.on("response", (response: Response) => {
    const url = response.url();
    const status = response.status();
    if (status < 500) return;
    if (!url.includes("/api/trpc") && !url.includes("/health") && !url.includes("/api/auth/")) return;
    watch.criticalApiFailures.push(`${status} ${url}`);
  });

  return watch;
}

function trpcProceduresFromUrl(url: string): string[] {
  try {
    const pathname = new URL(url).pathname;
    const marker = "/api/trpc/";
    const index = pathname.indexOf(marker);
    if (index < 0) return [];
    return pathname.slice(index + marker.length).split(",").filter(Boolean);
  } catch {
    return [];
  }
}

export async function assertReadOnlyWatch(watch: PageWatch) {
  expect(watch.pageErrors, `JavaScript pageerror:\n${watch.pageErrors.join("\n")}`).toEqual([]);
  expect(watch.criticalApiFailures, `Critical API 5xx:\n${watch.criticalApiFailures.join("\n")}`).toEqual([]);
  expect(watch.persistentWrites, `Persistent write attempted:\n${watch.persistentWrites.join("\n")}`).toEqual([]);
}

export async function openPublicPath(page: Page, path: string) {
  const watch = attachReadOnlyGuards(page);
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `No HTTP response for ${path}`).toBeTruthy();
  const status = response!.status();
  expect(status, `Unexpected HTTP ${status} for ${path}`).toBeLessThan(400);
  await expect(page.locator("header").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("An unexpected error occurred.")).toHaveCount(0);
  return watch;
}

export async function waitUntilSettled(page: Page, loadingTexts: string[]) {
  for (const text of loadingTexts) {
    await expect(page.getByText(text)).toHaveCount(0);
  }
}

export type TrpcQueryIntent = "read" | "auth-probe";

export async function trpcQuery(
  request: APIRequestContext,
  procedure: string,
  input?: unknown,
  options?: { intent?: TrpcQueryIntent },
) {
  assertReadSafeProcedure(procedure, options?.intent);
  const payload = { "0": { json: input ?? null } };
  const url = `/api/trpc/${procedure}?batch=1&input=${encodeURIComponent(JSON.stringify(payload))}`;
  const response = await request.get(url);
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { status: response.status(), body };
}

export async function trpcMutation(request: APIRequestContext, procedure: string, input?: unknown) {
  const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${process.env.E2E_PORT || "3100"}`;
  const guard = mutationGuardFromProcessEnv(process.env, baseURL);
  if (!guard.allowed) {
    throw new Error(`QA-AUTO mutation bloqueada: ${guard.reason}`);
  }
  const serialized = superjson.serialize(input ?? {});
  const response = await request.post(`/api/trpc/${procedure}?batch=1`, {
    headers: { "content-type": "application/json", origin: baseURL },
    data: { "0": serialized },
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { status: response.status(), body };
}

export function trpcErrorMessage(body: unknown): string | undefined {
  const fromNode = (node: unknown): string | undefined => {
    if (!node || typeof node !== "object") return undefined;
    const rec = node as {
      error?: { json?: { message?: string }; message?: string };
      message?: string;
    };
    return rec.error?.json?.message || rec.error?.message || (typeof rec.message === "string" ? rec.message : undefined);
  };
  if (Array.isArray(body)) return fromNode(body[0]);
  return fromNode(body);
}

export function trpcErrorCode(body: unknown): string | undefined {
  const fromNode = (node: unknown): string | undefined => {
    if (!node || typeof node !== "object") return undefined;
    const rec = node as {
      error?: { json?: { data?: { code?: string } }; data?: { code?: string } };
      data?: { code?: string };
      code?: string;
    };
    return rec.error?.json?.data?.code || rec.error?.data?.code || rec.data?.code || (typeof rec.code === "string" ? rec.code : undefined);
  };
  if (Array.isArray(body)) return fromNode(body[0]);
  const code = fromNode(body);
  if (code) return code;
  return undefined;
}

export function unwrapTrpcData(body: unknown): unknown {
  if (!Array.isArray(body)) return body;
  const data = (body[0] as { result?: { data?: unknown } } | undefined)?.result?.data;
  if (data && typeof data === "object" && data !== null && "json" in data) {
    return (data as { json: unknown }).json;
  }
  return data;
}

export async function findPublicProfessionalSlug(request: APIRequestContext): Promise<string | null> {
  const { status, body } = await trpcQuery(request, "networkDirectory.publicList", {
    kind: "profissional",
    limit: 5,
    offset: 0,
  });
  if (status >= 500) throw new Error(`networkDirectory.publicList failed with HTTP ${status}`);
  const data = unwrapTrpcData(body) as { items?: Array<{ slug?: string | null; href?: string }> } | undefined;
  const items = data?.items || [];
  const withSlug = items.find(item => item.slug);
  if (withSlug?.slug) return withSlug.slug;
  const href = items.find(item => item.href?.includes("/rede/profissionais/"))?.href;
  if (!href) return null;
  const parts = href.split("/").filter(Boolean);
  return parts[parts.length - 1] || null;
}

export async function findPublicTerritorySlug(request: APIRequestContext): Promise<string | null> {
  const { status, body } = await trpcQuery(request, "editorial.publicTerritories");
  if (status >= 500) throw new Error(`editorial.publicTerritories failed with HTTP ${status}`);
  const list = unwrapTrpcData(body) as Array<{ slug?: string }> | undefined;
  return list?.find(item => item.slug)?.slug || null;
}

export function isInternalOjuHref(href: string, origin: string): boolean {
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;
  if (href.startsWith("#")) return false;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      return new URL(href).origin === origin;
    } catch {
      return false;
    }
  }
  return href.startsWith("/");
}

export type AuthMe = {
  id: number;
  role: string;
  adminAccess: boolean;
  email?: string | null;
  accountStatus?: string | null;
} | null;

export async function readAuthMe(request: APIRequestContext): Promise<{ status: number; user: AuthMe; code?: string }> {
  const { status, body } = await trpcQuery(request, "auth.me");
  const code = trpcErrorCode(body);
  const user = (unwrapTrpcData(body) as AuthMe) ?? null;
  return { status, user, code };
}

export function denied(status: number, body: unknown) {
  const code = trpcErrorCode(body);
  return status === 401 || status === 403 || code === "UNAUTHORIZED" || code === "FORBIDDEN";
}

export const MISSING_PERSONA =
  "Não existe persona persistida adequada para este cenário; nenhum dado foi criado.";

export const STALE_PROFESSIONAL_SESSION =
  "professional.json sem user no banco (TestLedger removeu o OAuth do run). Identidade fica na jornada da Rede. Não é FAIL.";

