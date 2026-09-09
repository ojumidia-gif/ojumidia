import { chromium, expect, test, request as playwrightRequest } from "@playwright/test";
import { COOKIE_NAME } from "../shared/const";
import { configuredParticipantEmail } from "./lib/journeys/participantEmail";
import { QA_APP_ORIGIN, isQaAppAfterOAuth, startGoogleLoginFromAdmin, waitForQaSessionCookie } from "./lib/journeys/googleCdp";
import { personaStatePath, type PersonaId } from "./personas";
import { readAuthMe } from "./support";

/**
 * Captura storageState de OAuth Google real.
 * Não lança Chromium/Chrome do Playwright: o Google recusa esse browser
 * ("Esse navegador ou app pode não ser seguro").
 * Conecta via CDP ao Chrome aberto com `pnpm qa:chrome`.
 */

const persona = (process.env.E2E_AUTH_PERSONA || "super-admin") as
  | "super-admin"
  | "professional"
  | "territorial-admin"
  | "professional-no-territory";

const personaId: PersonaId =
  persona === "professional"
    ? "professional"
    : persona === "territorial-admin"
      ? "territorialAdmin"
      : persona === "professional-no-territory"
        ? "professionalNoTerritory"
        : "superAdmin";

const cdpUrl = process.env.E2E_AUTH_CDP_URL || "http://127.0.0.1:9222";

test("capturar storageState de sessão Google real", async () => {
  test.setTimeout(300_000);
  test.skip(
    process.env.E2E_AUTH_CAPTURE !== "1",
    "Captura de sessão é manual. Login real grava auditoria; não roda na suíte de leitura.",
  );

  let browser;
  try {
    browser = await chromium.connectOverCDP(cdpUrl);
  } catch {
    throw new Error(
      `ABORTADO: Chrome CDP indisponível em ${cdpUrl}. Rode \`pnpm qa:chrome\` e complete o Google nessa janela. Não use o Chromium do Playwright.`,
    );
  }

  try {
    const { context, page } = await (async () => {
      const existing = browser.contexts()[0];
      if (!existing) throw new Error("Chrome CDP sem contexto.");
      const oauthPage = await existing.newPage();
      await oauthPage.bringToFront();
      return { context: existing, page: oauthPage };
    })();

    if (personaId === "professional") {
      await context.clearCookies({ domain: "127.0.0.1" }).catch(async () => {
        const hostCookies = await context.cookies(QA_APP_ORIGIN);
        if (hostCookies.length) await context.clearCookies();
      });
    }

    await startGoogleLoginFromAdmin(page);
    await waitForQaSessionCookie(context, {
      timeoutMs: 240_000,
      email: personaId === "professional" ? configuredParticipantEmail() || undefined : undefined,
    });
    await page.waitForURL(url => isQaAppAfterOAuth(url), { timeout: 60_000 }).catch(() => undefined);

    const landed = new URL(page.url());
    expect(landed.searchParams.get("erro"), "callback OAuth recusado ou URI de redirect divergente").not.toBe("oauth");
    expect(landed.searchParams.get("erro"), "conta recusada no callback").not.toBe("conta");

    if (personaId === "superAdmin") {
      await expect(page.getByText("Painel nacional")).toBeVisible({ timeout: 30_000 });
      const logout = page.getByRole("button", { name: /Sair/ });
      if ((await logout.count()) === 0) {
        await page.locator("header").getByRole("button").first().click();
      }
      await expect(logout).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("button", { name: "Entrar com Google" })).toHaveCount(0);
    }

    const hostCookies = await context.cookies(QA_APP_ORIGIN);
    expect(
      hostCookies.some(cookie => cookie.name === COOKIE_NAME),
      "nenhum cookie de sessão no host QA 127.0.0.1:3100",
    ).toBe(true);

    const api = await playwrightRequest.newContext({
      baseURL: QA_APP_ORIGIN,
      storageState: await context.storageState(),
    });
    try {
      const { user, status } = await readAuthMe(api);
      expect(status, "auth.me HTTP").toBe(200);
      expect(user, "auth.me sem usuário após o callback").toBeTruthy();
      if (personaId === "superAdmin") {
        expect(user!.adminAccess, "sessão Super Admin sem adminAccess").toBeTruthy();
        expect(user!.role).toBe("administrador principal");
      } else if (personaId === "professional") {
        const expected = configuredParticipantEmail();
        if (!expected) {
          throw new Error("E2E_QA_PARTICIPANT_EMAIL obrigatório para capturar professional.json.");
        }
        expect(user!.email?.trim().toLowerCase(), "FAIL identidade: auth.me.email ≠ participante QA").toBe(expected);
        expect(user!.role, "FAIL: não use a conta Super Admin como participante").not.toBe("administrador principal");
        expect(user!.adminAccess, "FAIL: participante da Rede não recebe adminAccess pelo OJU-AR pendente").toBe(false);
      } else if (personaId === "territorialAdmin") {
        expect(user!.adminAccess, "admin territorial exige termo gov.br oficial").toBeTruthy();
        expect(user!.role).not.toBe("administrador principal");
      }
    } finally {
      await api.dispose();
    }

    const snapshot = await context.storageState();
    expect(
      snapshot.cookies.some(cookie => cookie.name === COOKIE_NAME),
      "storageState vazio ou sem sessão — arquivo não será gravado",
    ).toBe(true);

    await context.storageState({ path: personaStatePath(personaId) });
    await page.close().catch(() => undefined);
  } finally {
    await browser.close();
  }
});
