import { eq, like } from "drizzle-orm";
import { commercialRequests, communityCareRequests, revenueLeads } from "../../../drizzle/schema";
import { expect, test } from "../../fixtures/cleanup";
import { registerOriginationCleanup } from "../../lib/originationCleanup";
import { registerPublicMutationCleanup } from "../../lib/publicMutationCleanup";
import { waitTrpcPost } from "../../lib/journeys/trpcWait";
import { requireQaDb } from "../../lib/qaDb";
import { qaMutationReadiness } from "../../lib/qaReadiness";
import { assertQaMysqlTarget } from "../../lib/qaTarget";
import { hasPersonaState, personaStatePath } from "../../personas";
import { trpcErrorCode, trpcQuery, unwrapTrpcData } from "../../support";

const readiness = qaMutationReadiness();
const skipAdmin = !hasPersonaState("superAdmin");

test.describe.configure({ mode: "serial" });

test.describe("Fluxos públicos fechados — UI → API → Super Admin → cleanup", () => {
  test("404: caminho inexistente não é tela em branco", async ({ page }) => {
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);
    const response = await page.goto("/qa-auto-caminho-inexistente", { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 0).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: "Este caminho não existe no acervo." })).toBeVisible();
    await page.getByRole("button", { name: "Voltar ao portal" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("Contato aponta para Ser parceiro; envio é mailto (dependência externa)", async ({ page }) => {
    await page.goto("/contato", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Quero ser Parceiro Ojú" })).toHaveAttribute("href", "/ser-parceiro");
    test.info().annotations.push({
      type: "skip",
      description: "SKIP — DEPENDÊNCIA EXTERNA: o formulário de /contato dispara mailto institucional. Não persiste no banco. O canal que persiste parceria é /ser-parceiro.",
    });
  });

  test("Licenciar mídia sem acervo: não inventa mídia nem concede uso", async ({ page }) => {
    await page.goto("/licenciar-midia", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Uso responsável começa pelo reconhecimento do direito." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Solicitar análise de licença" })).toBeDisabled();
  });

  test("Visitante planeja registro → Super Admin vê em Solicitações", async ({ browser, ledger, page }) => {
    test.skip(!readiness.guard.allowed, readiness.guard.reason);
    test.skip(skipAdmin, "BLOCKED: Super Admin QA ausente.");
    test.setTimeout(120_000);
    registerOriginationCleanup(ledger);
    const marker = `QA-AUTO planejamento ${ledger.runId}`;

    await page.goto("/planejar-um-registro", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Nome ou organização").fill(marker);
    await page.getByLabel("WhatsApp para contato").fill("92988001122");
    await page.getByLabel("O que é importante preservar?").fill(`Contexto ${ledger.runId} para fluxo fechado de cobertura. Sem Opportunity.`);
    await page.locator("label").filter({ hasText: "Autorizo a Ojú a usar estes dados" }).locator("input").check();

    const wait = waitTrpcPost(page, "commercial.requestCoverage");
    await page.getByRole("button", { name: /Enviar para planejamento/ }).click();
    const response = await wait;
    expect(response.status()).toBeLessThan(400);
    expect(trpcErrorCode(await response.json())).toBeUndefined();
    await expect(page.getByRole("heading", { name: "A conversa pode começar." })).toBeVisible();

    const db = await requireQaDb();
    const row = (await db.select().from(commercialRequests).where(eq(commercialRequests.clientName, marker)).limit(1))[0];
    expect(row, "pedido de planejamento não persistiu").toBeTruthy();
    ledger.add("commercialRequest", row.id);

    const admin = await browser.newContext({ storageState: personaStatePath("superAdmin") });
    try {
      const adminPage = await admin.newPage();
      await adminPage.goto("/admin/solicitacoes", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Contratações, entrega e consentimento." })).toBeVisible();
      await expect(adminPage.getByRole("heading", { name: marker })).toBeVisible();
      const list = await trpcQuery(admin.request, "commercial.list");
      const items = (unwrapTrpcData(list.body) as Array<{ id: number }>) || [];
      expect(items.some(item => item.id === row.id)).toBe(true);
    } finally {
      await admin.close();
    }
  });

  test("Visitante apoia memória → Super Admin vê em Receitas", async ({ browser, ledger, page }) => {
    test.skip(!readiness.guard.allowed, readiness.guard.reason);
    test.skip(skipAdmin, "BLOCKED: Super Admin QA ausente.");
    registerPublicMutationCleanup(ledger);
    const db = await requireQaDb();
    const leftovers = await db.select({ id: revenueLeads.id }).from(revenueLeads).where(like(revenueLeads.contactName, "QA-AUTO apoio%"));
    for (const row of leftovers) ledger.add("revenueLead", row.id);
    const marker = `QA-AUTO apoio ${ledger.runId}`;

    await page.goto("/apoie-uma-memoria", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Nome ou organização").fill(marker);
    await page.getByLabel("WhatsApp").fill("92988001122");
    await page.getByLabel("O que deseja apoiar?").fill(`Série territorial ${ledger.runId}`);
    const wait = waitTrpcPost(page, "revenue.createPublic");
    await page.getByRole("button", { name: "Enviar interesse" }).click();
    const response = await wait;
    expect(response.status()).toBeLessThan(400);
    const created = unwrapTrpcData(await response.json()) as { id?: number };
    expect(created.id).toBeTruthy();
    ledger.add("revenueLead", created.id!);
    await expect(page.getByText("Recebemos seu interesse.")).toBeVisible();

    const lead = (await db.select().from(revenueLeads).where(eq(revenueLeads.id, created.id!)).limit(1))[0];
    expect(lead).toBeTruthy();
    expect(lead.contactName).toBe(marker);

    const admin = await browser.newContext({ storageState: personaStatePath("superAdmin") });
    try {
      const adminPage = await admin.newPage();
      await adminPage.goto("/admin/receitas", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Apoios, licenças e oficinas." })).toBeVisible();
      await expect(adminPage.getByRole("heading", { name: marker })).toBeVisible();
    } finally {
      await admin.close();
    }
  });

  test("Visitante pede acolhimento → protocolo → Super Admin vê notificação", async ({ browser, ledger, page }) => {
    test.skip(!readiness.guard.allowed, readiness.guard.reason);
    test.skip(skipAdmin, "BLOCKED: Super Admin QA ausente.");
    registerPublicMutationCleanup(ledger);
    const db = await requireQaDb();
    const leftovers = await db.select({ id: communityCareRequests.id }).from(communityCareRequests).where(like(communityCareRequests.requesterName, "QA-AUTO acolhimento%"));
    for (const row of leftovers) ledger.add("careRequest", row.id);
    const marker = `QA-AUTO acolhimento ${ledger.runId}`;

    await page.goto("/cuidado-e-consentimento", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Nome ou identificação segura").fill(marker);
    await page.getByLabel("Canal seguro para retorno").fill("qa-auto@example.invalid");
    await page.getByLabel("Conte o necessário para começarmos").fill(`Pedido reservado ${ledger.runId} para fluxo fechado. Sem emergência.`);
    const wait = waitTrpcPost(page, "community.createCareRequest");
    await page.getByRole("button", { name: "Enviar com reserva" }).click();
    const response = await wait;
    expect(response.status()).toBeLessThan(400);
    const created = unwrapTrpcData(await response.json()) as { id?: number; trackingCode?: string };
    expect(created.id).toBeTruthy();
    expect(created.trackingCode).toBeTruthy();
    ledger.add("careRequest", created.id!);
    await expect(page.getByText("Pedido recebido com reserva.")).toBeVisible();
    const protocol = created.trackingCode!;
    expect(protocol.startsWith("AC-")).toBe(true);

    await page.goto("/acompanhar-acolhimento", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Protocolo de acolhimento").fill(protocol);
    await page.getByRole("button", { name: "Consultar status" }).click();
    await expect(page.getByText("Pedido recebido")).toBeVisible();

    const row = (await db.select().from(communityCareRequests).where(eq(communityCareRequests.id, created.id!)).limit(1))[0];
    expect(row).toBeTruthy();
    ledger.add("careRequest", row.id);

    const admin = await browser.newContext({ storageState: personaStatePath("superAdmin") });
    try {
      const adminPage = await admin.newPage();
      await adminPage.goto("/admin/notificacoes-acolhimento", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Notificações de acolhimento." })).toBeVisible();
      await expect(adminPage.getByText(marker)).toBeVisible();
    } finally {
      await admin.close();
    }
  });
});
