import { existsSync, unlinkSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import {
  adminJoinRequests,
  collaboratorAccessGrants,
  partners,
  professionalProfiles,
  taxonomies,
  users,
} from "../../../drizzle/schema";
import { COOKIE_NAME } from "../../../shared/const";
import { requireQaDb } from "../qaDb";
import { isQaAppAfterOAuth, openDedicatedCdpPage, startGoogleLoginFromAdmin, waitForQaSessionCookie } from "./googleCdp";
import { configuredParticipantEmail } from "./participantEmail";
import { personaStatePath } from "../../personas";
import { waitTrpcPost } from "./trpcWait";
import { expect } from "@playwright/test";
import type { TestLedger } from "../testLedger";
import { unwrapTrpcData } from "../../support";

export async function bootstrapOfficialParticipant(input: {
  browser: Browser;
  admin: BrowserContext;
  ledger: TestLedger;
  visitorPage: Page;
}) {
  const { browser, admin, ledger, visitorPage } = input;
  const email = configuredParticipantEmail();
  if (!email) {
    throw new Error("E2E_QA_PARTICIPANT_EMAIL ausente. Opportunity.invite exige perfil profissional oficial.");
  }
  const runId = ledger.runId;
  const displayName = `QA AUTO ${runId}`;
  const cityName = `Cidade ${runId}`.slice(0, 80);
  const message = `Pedido ${runId} para jornada operacional. Sem seed.`;

  await visitorPage.goto("/ser-parceiro", { waitUntil: "domcontentloaded" });
  await visitorPage.getByLabel("Nome").fill(displayName);
  await visitorPage.getByLabel("E-mail para resposta").fill(email);
  await visitorPage.getByLabel("WhatsApp").fill("92988001122");
  await visitorPage.locator("fieldset").filter({ hasText: "Cidade de atuação" }).locator("select").first().selectOption("AM");
  await visitorPage.locator("fieldset").filter({ hasText: "Cidade de atuação" }).locator("select").nth(1).selectOption("outro");
  await visitorPage.getByLabel("Cidade não listada").fill(cityName);
  await visitorPage.locator("label").filter({ hasText: "Fotógrafo." }).locator('input[type="checkbox"]').check();
  await visitorPage.getByLabel("Por que a Ojú e o que você já documenta").fill(message);
  await visitorPage.locator("label").filter({ hasText: "Li os" }).locator("input").check();
  const submitWait = waitTrpcPost(visitorPage, "joinRequests.submit");
  await visitorPage.getByRole("button", { name: /Enviar pedido/ }).click();
  expect((await submitWait).status()).toBeLessThan(400);

  const db = await requireQaDb();
  const joinRow = (await db.select().from(adminJoinRequests).where(and(eq(adminJoinRequests.email, email), eq(adminJoinRequests.message, message))).limit(1))[0];
  expect(joinRow).toBeTruthy();
  ledger.add("joinRequest", joinRow.id);
  const profileDraft = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.email, email)).limit(1))[0];
  expect(profileDraft).toBeTruthy();
  ledger.add("professionalProfile", profileDraft.id, undefined, { kind: "joinRequest", id: joinRow.id });

  const adminPage = await admin.newPage();
  await adminPage.goto("/admin/candidaturas", { waitUntil: "domcontentloaded" });
  const card = adminPage.locator("article").filter({ hasText: runId });
  await expect(card).toBeVisible();
  const reviewWait = waitTrpcPost(adminPage, "joinRequests.review");
  await card.getByRole("button", { name: "Aprovada" }).click();
  expect((await reviewWait).status()).toBeLessThan(400);

  await card.getByRole("link", { name: "Habilitar no painel" }).click();
  await adminPage.locator("fieldset").filter({ hasText: "Cidade de atuação" }).locator("select").first().selectOption("AM");
  await adminPage.locator("fieldset").filter({ hasText: "Cidade de atuação" }).locator("select").nth(1).selectOption("outro");
  await adminPage.getByLabel("Cidade não listada").fill(cityName);
  const taxonomiesBefore = new Set((await db.select({ id: taxonomies.id }).from(taxonomies)).map(row => row.id));
  const authorizeWait = waitTrpcPost(adminPage, "collaborators.authorizePartnerCandidate");
  await adminPage.getByRole("button", { name: "Habilitar parceiro nesta cidade" }).click();
  const authorizeResponse = await authorizeWait;
  const authorized = unwrapTrpcData(await authorizeResponse.json()) as {
    id: number;
    partnerId: number;
    territoryId: number;
    professionalProfileId: number;
  };
  ledger.add("collaboratorGrant", authorized.id, undefined, { kind: "joinRequest", id: joinRow.id });
  ledger.add("partner", authorized.partnerId, undefined, { kind: "joinRequest", id: joinRow.id });
  ledger.add("professionalProfile", authorized.professionalProfileId, undefined, { kind: "joinRequest", id: joinRow.id });
  if (!taxonomiesBefore.has(authorized.territoryId)) {
    ledger.add("taxonomy", authorized.territoryId, undefined, { kind: "partner", id: authorized.partnerId });
  }

  const { chromium } = await import("@playwright/test");
  const cdpUrl = process.env.E2E_AUTH_CDP_URL || "http://127.0.0.1:9223";
  let cdp;
  try {
    cdp = await chromium.connectOverCDP(cdpUrl);
  } catch {
    throw new Error(`FAIL OAuth: Chrome CDP indisponível em ${cdpUrl}. Operador: pnpm qa:chrome.`);
  }
  let oauthPage: Page | null = null;
  try {
    const dedicated = await openDedicatedCdpPage(cdp);
    oauthPage = dedicated.page;
    await dedicated.context.clearCookies({ domain: "127.0.0.1" }).catch(() => undefined);
    await startGoogleLoginFromAdmin(dedicated.page);
    await waitForQaSessionCookie(dedicated.context, { timeoutMs: 240_000, email });
    await dedicated.page.waitForURL(url => isQaAppAfterOAuth(url), { timeout: 60_000 }).catch(() => undefined);
    const snapshot = await dedicated.context.storageState();
    expect(snapshot.cookies.some(cookie => cookie.name === COOKIE_NAME)).toBe(true);
    await dedicated.context.storageState({ path: personaStatePath("professional") });
  } finally {
    await oauthPage?.close().catch(() => undefined);
    const leftoverUser = (await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, email)).limit(1))[0];
    if (leftoverUser && leftoverUser.role !== "administrador principal") {
      ledger.add("user", leftoverUser.id, undefined, { kind: "collaboratorGrant", id: authorized.id });
    }
    await cdp.close().catch(() => undefined);
  }

  const professionalCtx = await browser.newContext({ storageState: personaStatePath("professional") });
  const partner = (await db.select().from(partners).where(eq(partners.id, authorized.partnerId)).limit(1))[0];
  const grant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, authorized.id)).limit(1))[0];
  return {
    email,
    displayName,
    cityName,
    adminPage,
    professionalCtx,
    partnerId: authorized.partnerId,
    territoryId: authorized.territoryId,
    profileId: authorized.professionalProfileId,
    grantId: authorized.id,
    partnerName: partner.displayName,
    grantUserId: grant.userId,
  };
}

export function unlinkProfessionalState() {
  const professionalState = personaStatePath("professional");
  if (existsSync(professionalState)) unlinkSync(professionalState);
}
