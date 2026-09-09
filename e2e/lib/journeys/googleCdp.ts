import type { Browser, BrowserContext, Page } from "@playwright/test";
import { COOKIE_NAME } from "../../../shared/const";

export const QA_APP_ORIGIN = "http://127.0.0.1:3100";

export function isGoogleOrOAuthStart(url: URL) {
  return url.hostname.endsWith("google.com") || url.pathname.startsWith("/api/auth/google/");
}

export function isQaAppAfterOAuth(url: URL) {
  return (
    url.hostname === "127.0.0.1" &&
    (url.port === "3100" || url.port === "") &&
    !url.pathname.startsWith("/api/auth/google")
  );
}

export async function maybeChooseGoogleAccount(page: Page, email: string) {
  const needle = email.trim().toLowerCase();
  if (!needle) return;
  const byAttr = page.locator(`[data-identifier="${needle}"]`);
  if ((await byAttr.count()) > 0) {
    await byAttr.first().click({ timeout: 3_000 }).catch(() => undefined);
    return;
  }
  const byText = page.getByText(email, { exact: false });
  if ((await byText.count()) > 0) {
    await byText.first().click({ timeout: 3_000 }).catch(() => undefined);
  }
}

export async function waitForQaSessionCookie(
  context: BrowserContext,
  options?: { timeoutMs?: number; email?: string },
) {
  const timeoutMs = options?.timeoutMs ?? 240_000;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const cookies = await context.cookies(QA_APP_ORIGIN);
    if (cookies.some(cookie => cookie.name === COOKIE_NAME)) return;
    if (options?.email) {
      for (const page of context.pages()) {
        if (page.url().includes("accounts.google.com") || page.url().includes("google.com")) {
          await maybeChooseGoogleAccount(page, options.email);
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(
    "OAuth: cookie app_session_id não surgiu em 127.0.0.1:3100. Complete o Google no Chrome aberto por pnpm qa:chrome (CDP). Não use o Chromium do Playwright.",
  );
}

export async function startGoogleLoginFromAdmin(page: Page) {
  await page.bringToFront();
  await page.goto(`${QA_APP_ORIGIN}/admin`, { waitUntil: "domcontentloaded" });
  const enter = page.getByRole("button", { name: "Entrar com Google" });
  if ((await enter.count()) > 0) {
    await enter.click();
    await page.waitForURL(url => isGoogleOrOAuthStart(url), { timeout: 60_000 });
  }
}

export async function openDedicatedCdpPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = browser.contexts()[0];
  if (!context) throw new Error("Chrome CDP sem contexto.");
  const page = await context.newPage();
  await page.bringToFront();
  return { context, page };
}
