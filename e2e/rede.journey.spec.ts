import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import {
  adminJoinRequests,
  auditEvents,
  collaboratorAccessGrants,
  commercialRequests,
  networkNotifications,
  partners,
  professionalProfiles,
  publications,
  taxonomies,
  users,
} from "../drizzle/schema";
import { expect, test } from "./fixtures/cleanup";
import { requireQaDb } from "./lib/qaDb";
import { registerRedeJourneyCleanup } from "./lib/redeJourneyCleanup";
import { qaMutationReadiness } from "./lib/qaReadiness";
import { assertQaMysqlTarget } from "./lib/qaTarget";
import { isQaAppAfterOAuth, openDedicatedCdpPage, startGoogleLoginFromAdmin, waitForQaSessionCookie } from "./lib/journeys/googleCdp";
import { hasPersonaState, personaStatePath } from "./personas";
import {
  denied,
  openPublicPath,
  readAuthMe,
  trpcErrorCode,
  trpcMutation,
  trpcQuery,
  unwrapTrpcData,
  waitUntilSettled,
} from "./support";
import { parseOriginFromNotes } from "../shared/professionalOrigination";
import type { BrowserContext, Page, Response } from "@playwright/test";
import { COOKIE_NAME } from "../shared/const";

const readiness = qaMutationReadiness();

async function waitTrpcPost(page: Page, procedure: string): Promise<Response> {
  return page.waitForResponse(response => {
    if (response.request().method() !== "POST") return false;
    return response.url().includes(`/api/trpc/${procedure}`);
  }, { timeout: 45_000 });
}

async function trpcBody(response: Response) {
  return response.json() as Promise<unknown>;
}

function participantEmailForRun(runId: string) {
  const configured = process.env.E2E_QA_PARTICIPANT_EMAIL?.trim().toLowerCase();
  if (configured) return { email: configured, googleAccount: !/@example\.(com|invalid)$/i.test(configured) };
  const token = runId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-18);
  return { email: `qa-auto.${token}@example.com`, googleAccount: false };
}

test.describe.configure({ mode: "serial" });

test.describe("FASE 2 — jornada da Rede", () => {
  test("visitante → candidatura → Super Admin → habilitar → OAuth/RBAC/Rede/originação → cleanup", async ({
    browser,
    ledger,
  }) => {
    test.setTimeout(400_000);

    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);
    expect(readiness.guard.allowed, readiness.guard.allowed ? "" : readiness.guard.reason).toBe(true);
    expect(process.env.S3_BUCKET || "", "Tigris/S3 não pode estar configurado no QA desta fase").toBe("");
    expect(process.env.TIGRIS_BUCKET || "", "Tigris proibido nesta fase").toBe("");
    expect(hasPersonaState("superAdmin"), "ABORTADO: e2e/.auth/super-admin.json ausente. Capture OAuth real da FASE 1.").toBe(true);

    registerRedeJourneyCleanup(ledger);
    const runId = ledger.runId;
    const { email, googleAccount } = participantEmailForRun(runId);
    const displayName = `QA AUTO ${runId}`;
    const cityName = `Cidade ${runId}`.slice(0, 80);
    const message = `Pedido ${runId} para jornada FASE 2. Sem dados pessoais. Sem seed.`;
    const skips: string[] = [];
    const permissions: Array<{ acao: string; persona: string; esperado: string; obtido: string }> = [];

    const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const admin = await browser.newContext({ storageState: personaStatePath("superAdmin") });
    let professionalCtx: BrowserContext | null = null;
    try {
    const visitorPage = await visitor.newPage();
    const visitorApi = visitor.request;

    const homeWatch = await openPublicPath(visitorPage, "/");
    expect(homeWatch.persistentWrites).toEqual([]);
    await visitorPage.getByRole("button", { name: "Chamar a Ojú" }).hover();
    await visitorPage.locator("header").getByRole("link", { name: "Ser parceiro" }).click();
    await expect(visitorPage).toHaveURL(/\/ser-parceiro$/);
    await expect(visitorPage.getByRole("heading", { name: "Entrar na Rede, na sua cidade." })).toBeVisible();

    const listAnon = await trpcQuery(visitorApi, "joinRequests.list");
    expect(denied(listAnon.status, listAnon.body), "visitante não lista candidaturas").toBe(true);
    permissions.push({ acao: "joinRequests.list", persona: "visitante", esperado: "UNAUTHORIZED", obtido: trpcErrorCode(listAnon.body) || String(listAnon.status) });

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
    const submitResponse = await submitWait;
    expect(submitResponse.status(), `joinRequests.submit HTTP ${submitResponse.status()}`).toBeLessThan(400);
    const submitBody = await trpcBody(submitResponse);
    expect(trpcErrorCode(submitBody), JSON.stringify(submitBody)).toBeUndefined();
    expect(unwrapTrpcData(submitBody)).toMatchObject({ success: true });
    await expect(visitorPage.getByRole("heading", { name: "Pedido recebido." })).toBeVisible();

    const db = await requireQaDb();
    const joinRow = (await db.select().from(adminJoinRequests).where(and(eq(adminJoinRequests.email, email), eq(adminJoinRequests.message, message))).limit(1))[0];
    expect(joinRow, "candidatura não persistiu no banco QA").toBeTruthy();
    expect(joinRow.status).toBe("Recebida");
    expect(joinRow.territoryText).toMatch(/AM/);
    expect(joinRow.territoryText).toContain(cityName);
    expect(joinRow.practice, "categoria da candidatura deve persistir").toMatch(/Fotógrafo/);
    ledger.add("joinRequest", joinRow.id);

    const profileDraft = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.email, email)).limit(1))[0];
    expect(profileDraft, "submit cria perfil rascunho pelo fluxo oficial — não ledgerar é FAIL").toBeTruthy();
    expect(profileDraft.status).toBe("Rascunho");
    expect(profileDraft.userId).toBeNull();
    ledger.add("professionalProfile", profileDraft.id, undefined, { kind: "joinRequest", id: joinRow.id });

    const featuredAnon = await trpcQuery(visitorApi, "editorial.featured", {});
    expect(featuredAnon.status).toBe(200);
    const featuredListBefore = (unwrapTrpcData(featuredAnon.body) as unknown[]) || [];

    const adminPage = await admin.newPage();
    const adminApi = admin.request;

    const me = await readAuthMe(adminApi);
    expect(me.status).toBe(200);
    expect(me.user?.role).toBe("administrador principal");
    expect(me.user!.adminAccess).toBeTruthy();
    expect(me.user!.id, "Super Admin não pode ser o e-mail da candidatura").not.toBeNull();
    expect(email).not.toBe((await db.select({ email: users.email }).from(users).where(eq(users.id, me.user!.id)).limit(1))[0]?.email?.toLowerCase());

    await adminPage.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(adminPage.getByText("Painel nacional")).toBeVisible();
    const overview = await trpcQuery(adminApi, "operations.overview", { limit: 10 });
    expect(trpcErrorCode(overview.body)).toBeUndefined();

    await adminPage.goto("/admin/candidaturas", { waitUntil: "domcontentloaded" });
    await expect(adminPage.getByRole("heading", { name: "Candidaturas a Parceiro Ojú." })).toBeVisible();
    const card = adminPage.locator("article").filter({ hasText: runId });
    await expect(card).toBeVisible();
    await expect(card.getByText(email)).toBeVisible();
    await expect(card.getByText("Especialidades: Fotógrafo")).toBeVisible();
    await expect(card.getByText("Recebida", { exact: false })).toBeVisible();

    const reviewWait = waitTrpcPost(adminPage, "joinRequests.review");
    await card.getByRole("button", { name: "Aprovada" }).click();
    const reviewResponse = await reviewWait;
    expect(reviewResponse.status()).toBeLessThan(400);
    expect(trpcErrorCode(await trpcBody(reviewResponse))).toBeUndefined();
    await expect(card.getByText("Aprovada", { exact: false })).toBeVisible();

    const joinAfterReview = (await db.select().from(adminJoinRequests).where(eq(adminJoinRequests.id, joinRow.id)).limit(1))[0];
    expect(joinAfterReview.status).toBe("Aprovada");
    expect(joinAfterReview.reviewedBy).toBe(me.user!.id);
    const reviewAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "join-request"), eq(auditEvents.resourceId, joinRow.id)));
    expect(reviewAudits.length, "auditoria de revisão da candidatura").toBeGreaterThan(0);
    for (const event of reviewAudits) ledger.add("auditEvent", event.id, undefined, { kind: "joinRequest", id: joinRow.id });

    const taxonomiesBefore = new Set((await db.select({ id: taxonomies.id }).from(taxonomies)).map(row => row.id));

    await card.getByRole("link", { name: "Habilitar no painel" }).click();
    await expect(adminPage).toHaveURL(new RegExp(`/admin/colaboradores\\?pedido=${joinRow.id}`));
    await expect(adminPage.getByText(displayName)).toBeVisible();
    await expect(adminPage.getByRole("button", { name: "Habilitar parceiro nesta cidade" })).toBeVisible();
    await adminPage.locator("fieldset").filter({ hasText: "Cidade de atuação" }).locator("select").first().selectOption("AM");
    await adminPage.locator("fieldset").filter({ hasText: "Cidade de atuação" }).locator("select").nth(1).selectOption("outro");
    await adminPage.getByLabel("Cidade não listada").fill(cityName);

    const authorizeWait = waitTrpcPost(adminPage, "collaborators.authorizePartnerCandidate");
    await adminPage.getByRole("button", { name: "Habilitar parceiro nesta cidade" }).click();
    const authorizeResponse = await authorizeWait;
    const authorizeBody = await trpcBody(authorizeResponse);
    expect(authorizeResponse.status(), JSON.stringify(authorizeBody)).toBeLessThan(400);
    expect(trpcErrorCode(authorizeBody), JSON.stringify(authorizeBody)).toBeUndefined();
    const authorized = unwrapTrpcData(authorizeBody) as {
      id: number;
      partnerId: number;
      territoryId: number;
      professionalProfileId: number;
      requiresResponsibilityTerm: boolean;
    };
    expect(authorized.requiresResponsibilityTerm).toBe(true);
    ledger.add("collaboratorGrant", authorized.id, undefined, { kind: "joinRequest", id: joinRow.id });
    ledger.add("partner", authorized.partnerId, undefined, { kind: "joinRequest", id: joinRow.id });
    ledger.add("professionalProfile", authorized.professionalProfileId, undefined, { kind: "joinRequest", id: joinRow.id });

    const joinEnabled = (await db.select().from(adminJoinRequests).where(eq(adminJoinRequests.id, joinRow.id)).limit(1))[0];
    expect(joinEnabled.status).toBe("Aprovada");
    const grant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, authorized.id)).limit(1))[0];
    expect(grant.status).toBe("Autorizado");
    expect(grant.role).toBe("administrador");
    expect(grant.email).toBe(email);
    expect(grant.territoryId).toBe(authorized.territoryId);
    expect(grant.partnerId).toBe(authorized.partnerId);
    expect(grant.createdBy).toBe(me.user!.id);
    const existingAccount = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (existingAccount) {
      expect(existingAccount.email?.toLowerCase()).toBe(email);
      expect(existingAccount.role).not.toBe("administrador principal");
      expect(grant.userId).toBe(existingAccount.id);
    } else {
      expect(grant.userId).toBeNull();
    }

    const partner = (await db.select().from(partners).where(eq(partners.id, authorized.partnerId)).limit(1))[0];
    expect(partner.status).toBe("Ativo");
    expect(partner.publicVisibility).toBe(false);
    expect(partner.createdBy).toBe(me.user!.id);

    const profileActive = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.id, authorized.professionalProfileId)).limit(1))[0];
    expect(profileActive.status).toBe("Ativo");
    expect(profileActive.territoryId).toBe(authorized.territoryId);
    expect(profileActive.partnerId).toBe(authorized.partnerId);
    expect(profileActive.publicVisible).toBe(false);
    expect(profileActive.createdBy).toBe(me.user!.id);

    if (!taxonomiesBefore.has(authorized.territoryId)) {
      ledger.add("taxonomy", authorized.territoryId, undefined, { kind: "partner", id: authorized.partnerId });
    }
    const grantAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "collaborator-grant"), eq(auditEvents.resourceId, authorized.id)));
    expect(grantAudits.length).toBeGreaterThan(0);
    for (const event of grantAudits) ledger.add("auditEvent", event.id, undefined, { kind: "collaboratorGrant", id: authorized.id });

    const directory = await trpcQuery(adminApi, "networkDirectory.publicList", { kind: "profissional", limit: 20, offset: 0 });
    expect(directory.status).toBe(200);
    const dirItems = (unwrapTrpcData(directory.body) as { items?: Array<{ slug?: string | null; href?: string }> })?.items || [];
    expect(
      dirItems.some(item => Boolean(profileActive.publicSlug) && item.slug === profileActive.publicSlug),
      "habilitar na Rede não publica o perfil no diretório público",
    ).toBe(false);

    const pubs = await db.select({ id: publications.id }).from(publications);
    expect(pubs.length, "jornada não cria publicação editorial").toBe(0);

    const featuredAfter = await trpcQuery(adminApi, "editorial.featured", {});
    const featuredListAfter = (unwrapTrpcData(featuredAfter.body) as unknown[]) || [];
    expect(featuredListAfter.length, "aprovação não coloca destaque na Home").toBe(featuredListBefore.length);

    const allowlist = (process.env.GOOGLE_SUPER_ADMIN_EMAILS || "").toLowerCase();
    expect(allowlist.includes(email), "FAIL: participante não pode estar em GOOGLE_SUPER_ADMIN_EMAILS").toBe(false);

    if (!googleAccount) {
      skips.push(
        "OAuth do novo participante: e-mail do run é @example.com (não há conta Google). Definir E2E_QA_PARTICIPANT_EMAIL. Sem prova de sessão, RBAC autenticado nem originação autenticada.",
      );
    } else {
      const { chromium } = await import("@playwright/test");
      const cdpUrl = process.env.E2E_AUTH_CDP_URL || "http://127.0.0.1:9222";
      let cdp;
      try {
        cdp = await chromium.connectOverCDP(cdpUrl);
      } catch {
        throw new Error(
          `FAIL OAuth: Chrome CDP indisponível em ${cdpUrl}. Operador: pnpm qa:chrome (perfil participante, porta do .env.qa). Depois selecione ${email} no Google. Não use o Chromium do Playwright.`,
        );
      }
      let oauthPage: Awaited<ReturnType<typeof openDedicatedCdpPage>>["page"] | null = null;
      try {
        const { context, page } = await openDedicatedCdpPage(cdp);
        oauthPage = page;
        await context.clearCookies({ domain: "127.0.0.1" }).catch(() => undefined);
        await startGoogleLoginFromAdmin(page);
        await waitForQaSessionCookie(context, { timeoutMs: 240_000, email });
        await page.waitForURL(url => isQaAppAfterOAuth(url), { timeout: 60_000 }).catch(() => undefined);
        const landed = new URL(page.url());
        expect(landed.searchParams.get("erro"), "callback OAuth recusado").not.toBe("oauth");
        expect(landed.searchParams.get("erro"), "conta recusada").not.toBe("conta");
        const snapshot = await context.storageState();
        expect(snapshot.cookies.some(cookie => cookie.name === COOKIE_NAME)).toBe(true);
        await context.storageState({ path: personaStatePath("professional") });
      } finally {
        await oauthPage?.close().catch(() => undefined);
        const leftoverUser = (await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, email)).limit(1))[0];
        if (leftoverUser && leftoverUser.role !== "administrador principal") {
          ledger.add("user", leftoverUser.id, undefined, { kind: "collaboratorGrant", id: authorized.id });
        }
        await cdp.close().catch(() => undefined);
      }
      professionalCtx = await browser.newContext({ storageState: personaStatePath("professional") });
    }

    if (professionalCtx) {
      const proApi = professionalCtx.request;
      const proPage = await professionalCtx.newPage();
      const proMe = await readAuthMe(proApi);
      expect(proMe.status).toBe(200);
      expect(proMe.user, "auth.me após OAuth").toBeTruthy();
      expect(proMe.user!.email?.trim().toLowerCase(), "FAIL identidade: auth.me.email ≠ e-mail da candidatura").toBe(email);
      expect(proMe.user!.adminAccess, "sem termo gov.br o grant administrador não ativa adminAccess").toBe(false);
      expect(proMe.user!.role).not.toBe("administrador principal");
      const linked = (await db.select().from(users).where(eq(users.id, proMe.user!.id)).limit(1))[0];
      expect(linked, "users row deve nascer no OAuth oficial").toBeTruthy();
      expect(linked.email?.toLowerCase(), "FAIL identidade: users.email ≠ Google").toBe(email);
      expect(linked.openId.startsWith("google:"), "user não veio de Google OAuth").toBe(true);
      ledger.add("user", linked.id, undefined, { kind: "collaboratorGrant", id: authorized.id });

      const grantLinked = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, authorized.id)).limit(1))[0];
      expect(grantLinked.email).toBe(email);
      expect(grantLinked.userId, "grant.userId ligado no upsert OAuth").toBe(linked.id);

      const profileLinked = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.id, authorized.professionalProfileId)).limit(1))[0];
      expect(profileLinked.email).toBe(email);
      expect(profileLinked.userId).toBe(linked.id);
      expect(profileLinked.territoryId).toBe(authorized.territoryId);

      const loginAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "auth"), eq(auditEvents.resourceId, linked.id)));
      for (const event of loginAudits) ledger.add("auditEvent", event.id, undefined, { kind: "user", id: linked.id });

      const listDenied = await trpcQuery(proApi, "joinRequests.list");
      expect(denied(listDenied.status, listDenied.body)).toBe(true);
      permissions.push({ acao: "joinRequests.list", persona: "participante", esperado: "FORBIDDEN", obtido: trpcErrorCode(listDenied.body) || String(listDenied.status) });

      const collabDenied = await trpcQuery(proApi, "collaborators.list");
      expect(denied(collabDenied.status, collabDenied.body)).toBe(true);
      permissions.push({ acao: "collaborators.list", persona: "participante", esperado: "FORBIDDEN", obtido: trpcErrorCode(collabDenied.body) || String(collabDenied.status) });

      const opp = await trpcMutation(proApi, "opportunities.create", {
        title: `QA ${runId}`,
        briefing: "Tentativa de Opportunity admin-only na jornada FASE 2.",
        workType: "Fotografia",
        territoryId: authorized.territoryId,
        totalValue: 100,
        specialtyIds: ["fotografo"],
      });
      expect(denied(opp.status, opp.body)).toBe(true);
      permissions.push({ acao: "opportunities.create", persona: "participante", esperado: "FORBIDDEN", obtido: trpcErrorCode(opp.body) || String(opp.status) });

      const featuredDenied = await trpcMutation(proApi, "editorial.setFeatured", {
        id: 1,
        manualFeatured: true,
        relevance: 1,
        homePlacement: "Destaque principal",
        homeOrder: 0,
      });
      expect(denied(featuredDenied.status, featuredDenied.body) || featuredDenied.status >= 400).toBe(true);
      permissions.push({ acao: "editorial.setFeatured", persona: "participante", esperado: "FORBIDDEN/NOT_FOUND", obtido: trpcErrorCode(featuredDenied.body) || String(featuredDenied.status) });

      await proPage.goto("/admin", { waitUntil: "domcontentloaded" });
      await expect(proPage.getByText("Painel nacional")).toHaveCount(0);

      await proPage.goto("/rede", { waitUntil: "domcontentloaded" });
      await expect(proPage.getByRole("heading", { name: "Conheça a Rede Ojú." })).toBeVisible();
      await proPage.goto("/rede/originar", { waitUntil: "domcontentloaded" });
      await expect(proPage.getByRole("heading", { name: "Originar uma demanda" })).toBeVisible();
      await expect(proPage.getByText(displayName)).toBeVisible();

      const originateWait = waitTrpcPost(proPage, "commercial.originateLead");
      await proPage.getByPlaceholder("Casa, parceiro ou pessoa de contato").fill(`${runId} casa`);
      await proPage.getByPlaceholder("WhatsApp ou e-mail para a Ojú retornar").fill("qa-auto@example.invalid");
      await proPage.getByPlaceholder("Título da demanda").fill(`Demanda ${runId}`);
      await proPage.getByPlaceholder("Contexto territorial, necessidade e relação. Sem preço público.").fill(`Briefing ${runId} para originação territorial. Sem Opportunity.`);
      await proPage.getByRole("button", { name: "Enviar para análise da Rede" }).click();
      const originateResponse = await originateWait;
      expect(originateResponse.status()).toBeLessThan(400);
      const originatePayload = unwrapTrpcData(await trpcBody(originateResponse)) as {
        id: number;
        originatedByProfessionalProfileId: number;
        createdByUserId: number;
        opportunityCreated: boolean;
      };
      expect(originatePayload.opportunityCreated).toBe(false);
      expect(originatePayload.originatedByProfessionalProfileId).toBe(authorized.professionalProfileId);
      expect(originatePayload.createdByUserId).toBe(proMe.user!.id);
      expect(originatePayload.createdByUserId).not.toBe(originatePayload.originatedByProfessionalProfileId);
      ledger.add("commercialRequest", originatePayload.id, undefined, { kind: "professionalProfile", id: authorized.professionalProfileId });

      const lead = (await db.select().from(commercialRequests).where(eq(commercialRequests.id, originatePayload.id)).limit(1))[0];
      expect(lead.territoryId).toBe(authorized.territoryId);
      expect(lead.partnerId).toBe(authorized.partnerId);
      const origin = parseOriginFromNotes(lead.notes);
      expect(origin?.kind).toBe("profissional");
      expect(origin?.originatedByProfessionalProfileId).toBe(authorized.professionalProfileId);
      expect(origin?.createdByUserId).toBe(proMe.user!.id);

      const notes = await db.select().from(networkNotifications).where(and(eq(networkNotifications.referenceType, "commercial-request"), eq(networkNotifications.referenceId, originatePayload.id)));
      for (const note of notes) {
        expect(note.recipientUserId).toBe(proMe.user!.id);
        ledger.add("notification", note.id, undefined, { kind: "commercialRequest", id: originatePayload.id });
      }
      const originAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "commercial-request"), eq(auditEvents.resourceId, originatePayload.id)));
      for (const event of originAudits) ledger.add("auditEvent", event.id, undefined, { kind: "commercialRequest", id: originatePayload.id });

      permissions.push({ acao: "commercial.originateLead", persona: "participante", esperado: "OK território próprio", obtido: "OK" });

      const mine = await trpcQuery(proApi, "commercial.myOriginationLeads");
      expect(mine.status).toBe(200);
      const mineData = unwrapTrpcData(mine.body) as { items?: Array<{ id: number; originatedByProfessionalProfileId?: number | null }> };
      expect(mineData.items?.some(item => item.id === originatePayload.id), "myOriginationLeads deve listar a originação própria").toBe(true);

      const adminDesk = await trpcQuery(adminApi, "commercial.list");
      const adminLeads = (unwrapTrpcData(adminDesk.body) as Array<{ id: number }>) || [];
      expect(adminLeads.some(item => item.id === originatePayload.id), "Super Admin precisa ver a originação na mesa comercial").toBe(true);
      await adminPage.goto("/admin/solicitacoes", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Contratações, entrega e consentimento." })).toBeVisible();
      await expect(adminPage.getByRole("heading", { name: `${runId} casa` })).toBeVisible();
      await adminPage.goto("/admin/parceiros", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Parceiros Ojú e cidades de atuação." })).toBeVisible();
      await expect(adminPage.getByText(displayName)).toBeVisible();
      await adminPage.goto("/admin/colaboradores", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Colaboradores e permissões." })).toBeVisible();
      await expect(adminPage.getByText(email)).toBeVisible();

      await adminPage.goto("/admin/fotografos", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Cadastrar e publicar fichas." })).toBeVisible();
      const directoryCard = adminPage.locator("article").filter({ hasText: displayName }).filter({ hasText: "fora do diretório" });
      await expect(directoryCard).toBeVisible();
      const visOnWait = waitTrpcPost(adminPage, "networkDirectory.setVisible");
      await directoryCard.getByRole("button", { name: "Publicar na Rede" }).click();
      const visOnResponse = await visOnWait;
      expect(visOnResponse.status(), await visOnResponse.text()).toBeLessThan(400);
      expect(trpcErrorCode(await trpcBody(visOnResponse))).toBeUndefined();
      const published = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.id, authorized.professionalProfileId)).limit(1))[0];
      expect(published.publicVisible, "Super Admin publicar na Rede deve persistir publicVisible").toBe(true);
      expect(published.publicSlug).toBeTruthy();
      const publishAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "network-directory-profile"), eq(auditEvents.resourceId, authorized.professionalProfileId)));
      expect(publishAudits.length, "auditoria de presença na Rede").toBeGreaterThan(0);
      for (const event of publishAudits) ledger.add("auditEvent", event.id, undefined, { kind: "professionalProfile", id: authorized.professionalProfileId });

      await visitorPage.goto(`/rede/profissionais/${published.publicSlug}`, { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByRole("heading", { name: displayName })).toBeVisible();

      await adminPage.goto("/admin/fotografos", { waitUntil: "domcontentloaded" });
      const publishedCard = adminPage.locator("article").filter({ hasText: displayName }).filter({ hasText: `/rede/profissionais/${published.publicSlug}` });
      await expect(publishedCard).toBeVisible();
      const visOffWait = waitTrpcPost(adminPage, "networkDirectory.setVisible");
      await publishedCard.getByRole("button", { name: "Ocultar da Rede" }).click();
      const visOffResponse = await visOffWait;
      expect(visOffResponse.status()).toBeLessThan(400);
      expect(trpcErrorCode(await trpcBody(visOffResponse))).toBeUndefined();
      const hidden = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.id, authorized.professionalProfileId)).limit(1))[0];
      expect(hidden.publicVisible).toBe(false);
      const hideAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "network-directory-profile"), eq(auditEvents.resourceId, authorized.professionalProfileId)));
      for (const event of hideAudits) ledger.add("auditEvent", event.id, undefined, { kind: "professionalProfile", id: authorized.professionalProfileId });
      await visitorPage.goto(`/rede/profissionais/${published.publicSlug}`, { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByRole("heading", { name: "Esta presença não está pública." })).toBeVisible();

      const commercialDesk = await trpcQuery(proApi, "commercial.list");
      expect(denied(commercialDesk.status, commercialDesk.body), "participante não vê a mesa comercial nacional").toBe(true);
      permissions.push({ acao: "commercial.list", persona: "participante", esperado: "UNAUTHORIZED/FORBIDDEN", obtido: trpcErrorCode(commercialDesk.body) || String(commercialDesk.status) });

      const mediaList = await trpcQuery(proApi, "media.list", { limit: 10, offset: 0 });
      expect(denied(mediaList.status, mediaList.body), "acervo editorial é protectedProcedure/adminAccess").toBe(true);
      permissions.push({ acao: "media.list", persona: "participante", esperado: "UNAUTHORIZED", obtido: trpcErrorCode(mediaList.body) || String(mediaList.status) });

      const earnings = await trpcQuery(proApi, "financial.earnings");
      expect(denied(earnings.status, earnings.body)).toBe(true);
      permissions.push({ acao: "financial.earnings", persona: "participante", esperado: "UNAUTHORIZED", obtido: trpcErrorCode(earnings.body) || String(earnings.status) });

      const ops = await trpcQuery(proApi, "operations.overview", { limit: 10 });
      expect(denied(ops.status, ops.body)).toBe(true);
      permissions.push({ acao: "operations.overview", persona: "participante", esperado: "UNAUTHORIZED", obtido: trpcErrorCode(ops.body) || String(ops.status) });

      const mediaCreate = await trpcMutation(proApi, "media.create", {
        mediaType: "foto",
        assetUrl: "https://example.invalid/x.jpg",
        origin: "QA",
        credit: "QA",
        authorization: "Autoral própria",
        purpose: "Tentativa fora do escopo",
        publicationAllowed: false,
      });
      expect(denied(mediaCreate.status, mediaCreate.body)).toBe(true);
      permissions.push({ acao: "media.create", persona: "participante", esperado: "UNAUTHORIZED", obtido: trpcErrorCode(mediaCreate.body) || String(mediaCreate.status) });

      skips.push("SKIP — DEPENDÊNCIA EXTERNA GOV.BR: adminAccess territorial (CMS) exige OJU-AR oficial. Aceite/Production própria não usam esse termo.");
      skips.push("Opportunity/Production próprias: ver jornada comercial. media.create do Acervo editorial continua protectedProcedure.");
      skips.push("Isolamento entre participantes: não há segunda identidade Google oficial neste run. Não foi fabricado participante B.");

      await professionalCtx.close();
      professionalCtx = null;
    } else {
      const visitor2 = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const originateAnon = await trpcMutation(visitor2.request, "commercial.originateLead", {
        clientName: runId,
        contact: "x@example.com",
        title: runId,
        briefing: "Não autenticado não origina.",
        workType: "Fotografia",
      });
      expect(denied(originateAnon.status, originateAnon.body)).toBe(true);
      permissions.push({ acao: "commercial.originateLead", persona: "visitante", esperado: "UNAUTHORIZED", obtido: trpcErrorCode(originateAnon.body) || String(originateAnon.status) });
      await visitor2.close();
      skips.push(
        "Isolamento entre participantes: não há segunda identidade oficial nesta jornada. Não foi fabricado participante B.",
      );
    }

    const regression = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const rp = await regression.newPage();
    for (const path of ["/", "/rede", "/rede/profissionais", "/territorios", "/busca", "/historias", "/comunidade", "/agenda", "/memorias"] as const) {
      await openPublicPath(rp, path);
      await waitUntilSettled(rp, ["Organizando a Rede…", "Organizando cidades autorizadas…", "Buscando no acervo...", "Carregando presença na Rede…"]);
    }
    await rp.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(rp.getByRole("heading", { name: "Centro Administrativo Ojú" })).toBeVisible();
    await expect(rp.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
    await regression.close();

    const leftoverJoin = (await db.select({ id: adminJoinRequests.id }).from(adminJoinRequests).where(eq(adminJoinRequests.id, joinRow.id)).limit(1))[0];
    expect(leftoverJoin, "IDs ainda existem antes do cleanup do fixture — esperado").toBeTruthy();

    await test.info().attach("fase2-ledger", {
      body: JSON.stringify({ runId, email, skips, ledger: ledger.list(), permissions, authorized }, null, 2),
      contentType: "application/json",
    });

    const storageRoot = process.env.LOCAL_STORAGE_DIR || ".qa-storage";
    const runDir = `${storageRoot}/${ledger.storagePrefix}`.replace(/\/+$/, "");
    if (existsSync(runDir) && readdirSync(runDir).length) {
      throw new Error(`Ghost storage em ${runDir} antes do cleanup`);
    }
    } finally {
      await visitor.close().catch(() => undefined);
      await admin.close().catch(() => undefined);
      await professionalCtx?.close().catch(() => undefined);
      const professionalState = personaStatePath("professional");
      if (existsSync(professionalState)) unlinkSync(professionalState);
    }
  });
});
