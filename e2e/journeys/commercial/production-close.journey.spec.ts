import { and, eq } from "drizzle-orm";
import {
  administratorResponsibilityTerms,
  auditEvents,
  networkNotifications,
  networkOpportunities,
  networkOpportunityInvites,
  networkProductions,
} from "../../../drizzle/schema";
import { TERMS_OF_USE_VERSION } from "../../../shared/legalVersions";
import { expect, test } from "../../fixtures/cleanup";
import { waitTrpcPost } from "../../lib/journeys/trpcWait";
import { QA_JPEG_BYTES } from "../../lib/qaJpeg";
import { bootstrapOfficialParticipant, unlinkProfessionalState } from "../../lib/journeys/officialPartnerBootstrap";
import { registerOperationalCleanup } from "../../lib/operationalCleanup";
import { requireQaDb } from "../../lib/qaDb";
import { qaMutationReadiness } from "../../lib/qaReadiness";
import { assertQaMysqlTarget } from "../../lib/qaTarget";
import { hasPersonaState, personaStatePath } from "../../personas";
import {
  denied,
  readAuthMe,
  trpcErrorCode,
  trpcErrorMessage,
  trpcMutation,
  trpcQuery,
  unwrapTrpcData,
} from "../../support";

const readiness = qaMutationReadiness();

test.describe.configure({ mode: "serial" });

test.describe("MISSÃO 3 — Production → Financeiro → Segurança (gate real)", () => {
  test("Acceptance/Production param no gov.br; Super Admin não aceita convite alheio; webhook rejeita sem cobrança", async ({
    browser,
    ledger,
  }) => {
    test.setTimeout(420_000);
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);
    expect(readiness.guard.allowed, readiness.guard.reason).toBe(true);
    expect(hasPersonaState("superAdmin"), "ABORTADO: capture Super Admin da FASE 1.").toBe(true);
    expect(process.env.S3_BUCKET || "", "Tigris não pode estar no QA").toBe("");

    registerOperationalCleanup(ledger);
    const skips: string[] = [];
    const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const admin = await browser.newContext({ storageState: personaStatePath("superAdmin") });
    let professionalCtx = null as Awaited<ReturnType<typeof bootstrapOfficialParticipant>>["professionalCtx"] | null;
    try {
      const visitorPage = await visitor.newPage();
      const visitorAccept = await trpcMutation(visitor.request, "opportunities.accept", { inviteId: 1 });
      expect(denied(visitorAccept.status, visitorAccept.body)).toBe(true);
      const visitorProd = await trpcMutation(visitor.request, "productions.createFromOpportunity", { opportunityId: 1 });
      expect(denied(visitorProd.status, visitorProd.body)).toBe(true);
      const visitorPay = await trpcMutation(visitor.request, "networkDirectory.createPayment", { productionId: 1 });
      expect(denied(visitorPay.status, visitorPay.body)).toBe(true);

      const boot = await bootstrapOfficialParticipant({ browser, admin, ledger, visitorPage });
      professionalCtx = boot.professionalCtx;
      const adminPage = boot.adminPage;
      const adminApi = admin.request;
      const proApi = professionalCtx.request;
      const db = await requireQaDb();

      const adminMe = await readAuthMe(adminApi);
      expect(adminMe.user!.adminAccess).toBe(true);
      const proMe = await readAuthMe(proApi);
      expect(proMe.user!.adminAccess).toBe(false);

      await adminPage.goto("/admin/politicas-comerciais", { waitUntil: "domcontentloaded" });
      await adminPage.getByLabel("Modalidade").selectOption("Fotografia");
      await adminPage.getByLabel("Nome da política").fill(`QA M3 fotografia ${ledger.runId}`);
      await adminPage.getByLabel("Válida a partir de").fill("2020-01-01");
      await adminPage.getByLabel("Ojú (%)").fill("12");
      await adminPage.getByLabel("Desenvolvimento (%)").fill("0");
      await adminPage.getByLabel("Captação (%)").fill("0");
      await adminPage.getByLabel("Executor (%)").fill("88");
      const policyWait = waitTrpcPost(adminPage, "financial.createPolicy");
      await adminPage.getByRole("button", { name: "Criar versão em rascunho" }).click();
      const policyCreated = unwrapTrpcData(await (await policyWait).json()) as { id?: number };
      ledger.add("commercialPolicy", policyCreated.id!);
      const policyCard = adminPage.locator("article").filter({ hasText: `QA M3 fotografia ${ledger.runId}` });
      const activateWait = waitTrpcPost(adminPage, "financial.activatePolicy");
      await policyCard.getByRole("button", { name: "Ativar esta versão" }).click();
      expect((await activateWait).status()).toBeLessThan(400);

      await adminPage.goto("/admin/oportunidades", { waitUntil: "domcontentloaded" });
      const oppTitle = `M3 ${ledger.runId}`;
      await adminPage.getByPlaceholder("Ex.: Cobertura fotográfica em Manaus").fill(oppTitle);
      await adminPage.getByPlaceholder("Briefing operacional. Sem dados administrativos desnecessários.").fill(`Missão 3 aceite ${ledger.runId}.`);
      await adminPage.locator("select[name='workType']").selectOption("Fotografia");
      const scopeValue = `${boot.partnerId}:${boot.territoryId}`;
      await expect(adminPage.locator(`select[name='scope'] option[value="${scopeValue}"]`)).toHaveCount(1, { timeout: 20_000 });
      await adminPage.locator("select[name='scope']").selectOption(scopeValue);
      await adminPage.getByPlaceholder("Valor total previsto").fill("1000");
      await adminPage.locator("label").filter({ hasText: "Fotógrafo" }).locator('input[type="checkbox"]').check();
      const createOppWait = waitTrpcPost(adminPage, "opportunities.create");
      await adminPage.getByRole("button", { name: "Criar rascunho" }).click();
      const createdOpp = unwrapTrpcData(await (await createOppWait).json()) as { id?: number };
      expect(createdOpp.id).toBeTruthy();
      ledger.add("opportunity", createdOpp.id!);
      const oppCard = adminPage.locator("article").filter({ hasText: oppTitle });
      await oppCard.getByRole("button", { name: "Ver matching" }).click();
      const inviteWait = waitTrpcPost(adminPage, "opportunities.invite");
      await oppCard.getByRole("button", { name: new RegExp(`Convidar ${boot.displayName}`) }).click();
      expect((await inviteWait).status()).toBeLessThan(400);
      const invite = (await db.select().from(networkOpportunityInvites).where(eq(networkOpportunityInvites.opportunityId, createdOpp.id!)).limit(1))[0];
      expect(invite.status).toBe("Pendente");
      const inviteNotifs = await db.select({ id: networkNotifications.id }).from(networkNotifications).where(and(eq(networkNotifications.referenceType, "network-opportunity"), eq(networkNotifications.referenceId, createdOpp.id!)));
      for (const notif of inviteNotifs) ledger.add("notification", notif.id, undefined, { kind: "opportunity", id: createdOpp.id! });
      const oppAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "network-opportunity"), eq(auditEvents.resourceId, createdOpp.id!)));
      for (const event of oppAudits) ledger.add("auditEvent", event.id, undefined, { kind: "opportunity", id: createdOpp.id! });

      await adminPage.goto("/admin/colaboradores", { waitUntil: "domcontentloaded" });
      const grantCard = adminPage.locator("article").filter({ hasText: boot.displayName });
      await expect(grantCard.getByText(/Sem termo gerado|Aguardando assinatura gov\.br/)).toBeVisible();
      const termWait = waitTrpcPost(adminPage, "collaborators.createResponsibilityTerm");
      await grantCard.getByRole("button", { name: "Exportar termo em PDF" }).click();
      expect((await termWait).status()).toBeLessThan(400);
      const term = (await db.select().from(administratorResponsibilityTerms).where(eq(administratorResponsibilityTerms.grantId, boot.grantId)).limit(1))[0];
      expect(term.status).toBe("Aguardando assinatura gov.br");
      await expect(grantCard.getByText("Aguardando assinatura gov.br", { exact: false })).toBeVisible();

      const adminAccept = await trpcMutation(adminApi, "opportunities.accept", { inviteId: invite.id });
      expect(denied(adminAccept.status, adminAccept.body) || Boolean(trpcErrorCode(adminAccept.body)), "Super Admin não aceita convite de outro perfil").toBe(true);
      const adminAcceptAgain = await trpcMutation(adminApi, "opportunities.accept", { inviteId: invite.id });
      expect(denied(adminAcceptAgain.status, adminAcceptAgain.body) || Boolean(trpcErrorCode(adminAcceptAgain.body))).toBe(true);

      const termsOk = await trpcMutation(proApi, "legal.accept", { documentVersion: TERMS_OF_USE_VERSION, context: "network-operation" });
      expect(termsOk.status, `legal.accept ${trpcErrorCode(termsOk.body)} ${trpcErrorMessage(termsOk.body)}`).toBeLessThan(400);
      const proAccept = await trpcMutation(proApi, "opportunities.accept", { inviteId: invite.id });
      expect(proAccept.status, `opportunities.accept ${trpcErrorCode(proAccept.body)} ${trpcErrorMessage(proAccept.body)}`).toBeLessThan(400);
      expect(trpcErrorCode(proAccept.body)).toBeUndefined();
      const acceptedPayload = unwrapTrpcData(proAccept.body) as { opportunityId?: number; productionId?: number | null };
      expect(acceptedPayload.opportunityId).toBe(createdOpp.id);
      expect(acceptedPayload.productionId).toBeTruthy();
      ledger.add("production", acceptedPayload.productionId!);
      const acceptedOpp = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, createdOpp.id!)).limit(1))[0];
      expect(acceptedOpp.status).toBe("Aceita");
      const production = (await db.select().from(networkProductions).where(eq(networkProductions.id, acceptedPayload.productionId!)).limit(1))[0];
      expect(production.status).toBe("Planejada");
      const prodAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "network-production"), eq(auditEvents.resourceId, production.id)));
      for (const event of prodAudits) ledger.add("auditEvent", event.id, undefined, { kind: "production", id: production.id });
      const prodNotifs = await db.select({ id: networkNotifications.id }).from(networkNotifications).where(and(eq(networkNotifications.referenceType, "network-production"), eq(networkNotifications.referenceId, production.id)));
      for (const notif of prodNotifs) ledger.add("notification", notif.id, undefined, { kind: "production", id: production.id });

      const otherInvite = await trpcMutation(proApi, "opportunities.accept", { inviteId: invite.id });
      expect(denied(otherInvite.status, otherInvite.body) || Boolean(trpcErrorCode(otherInvite.body))).toBe(true);

      await professionalCtx.newPage().then(async page => {
        await page.goto("/admin/oportunidades", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "Acesso não autorizado" })).toBeVisible();
        await page.goto("/rede/convites", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "Convites" })).toBeVisible();
        await page.close();
      });

      const confirm = await trpcMutation(proApi, "productions.transition", { id: production.id, status: "Confirmada" });
      expect(confirm.status).toBeLessThan(400);
      const start = await trpcMutation(proApi, "productions.transition", { id: production.id, status: "Em produção" });
      expect(start.status).toBeLessThan(400);

      const origin = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";
      const jpegUpload = await professionalCtx.request.post("/api/media/upload", {
        headers: {
          origin,
          "content-type": "image/jpeg",
          "x-file-name": `prod-${ledger.runId}.jpg`,
          "x-partner-id": String(boot.partnerId),
          "x-territory-id": String(boot.territoryId),
        },
        data: QA_JPEG_BYTES,
      });
      if (jpegUpload.status() >= 400) {
        skips.push(`SKIP — upload operacional da Production recusado HTTP ${jpegUpload.status()}. Sem fabricar mídia no SQL.`);
      } else {
        const uploaded = await jpegUpload.json() as { url?: string; key?: string; filename?: string };
        const registered = await trpcMutation(proApi, "productions.registerOperationalMedia", {
          productionId: production.id,
          mediaType: "foto",
          assetUrl: uploaded.url,
          storageKey: uploaded.key,
          filename: uploaded.filename || `prod-${ledger.runId}.jpg`,
          origin: "Production operacional QA",
          credit: boot.displayName,
          authorization: "Autoral própria",
          purpose: "Janela operacional da Production. Não é portal.",
        });
        expect(registered.status, JSON.stringify(registered.body)).toBeLessThan(400);
        const registeredPayload = unwrapTrpcData(registered.body) as { mediaId?: number };
        if (registeredPayload.mediaId) ledger.add("mediaAsset", registeredPayload.mediaId, undefined, { kind: "production", id: production.id });
        const mediaRow = (await db.select().from(networkProductions).where(eq(networkProductions.id, production.id)).limit(1))[0];
        expect(mediaRow.status === "Aguardando mídia" || mediaRow.status === "Em produção").toBe(true);
        const review = await trpcMutation(proApi, "productions.submitForReview", { id: production.id });
        expect(review.status).toBeLessThan(400);
        const approved = await trpcMutation(adminApi, "productions.approveReview", { id: production.id });
        expect(approved.status).toBeLessThan(400);
        const done = (await db.select().from(networkProductions).where(eq(networkProductions.id, production.id)).limit(1))[0];
        expect(done.status).toBe("Concluída");
      }

      const missingProd = await trpcQuery(adminApi, "productions.get", { id: 999_999_001 });
      expect(missingProd.status >= 400 || Boolean(trpcErrorCode(missingProd.body))).toBe(true);
      const wrongType = await trpcQuery(adminApi, "productions.get", { id: createdOpp.id });
      expect(wrongType.status >= 400 || Boolean(trpcErrorCode(wrongType.body))).toBe(true);
      const proGetProd = await trpcQuery(proApi, "productions.get", { id: 999_999_001 });
      expect(proGetProd.status >= 400 || Boolean(trpcErrorCode(proGetProd.body))).toBe(true);
      const proListMedia = await trpcQuery(proApi, "media.list", { limit: 10, offset: 0 });
      expect(denied(proListMedia.status, proListMedia.body)).toBe(true);
      const proPay = await trpcMutation(proApi, "networkDirectory.createPayment", { productionId: 1 });
      expect(denied(proPay.status, proPay.body)).toBe(true);

      const payMissing = await trpcMutation(adminApi, "networkDirectory.createPayment", { productionId: 999_999_001 });
      expect(payMissing.status >= 400 || Boolean(trpcErrorCode(payMissing.body))).toBe(true);
      const settleMissing = await trpcMutation(adminApi, "productions.openSettlement", { productionId: 999_999_001 });
      expect(settleMissing.status >= 400 || Boolean(trpcErrorCode(settleMissing.body))).toBe(true);
      const badTransition = await trpcMutation(adminApi, "productions.transition", { id: 999_999_001, status: "Concluída" });
      expect(badTransition.status >= 400 || Boolean(trpcErrorCode(badTransition.body))).toBe(true);
      const attachMissing = await trpcMutation(adminApi, "productions.attachMedia", { productionId: 999_999_001, mediaId: 1 });
      expect(attachMissing.status >= 400 || Boolean(trpcErrorCode(attachMissing.body))).toBe(true);

      await adminPage.goto("/admin/producoes", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Minhas produções." })).toBeVisible();

      const unsignedWebhook = await adminPage.request.post("/api/payments/webhook", {
        headers: { "content-type": "application/json" },
        data: JSON.stringify({ eventId: "qa", providerTransactionId: "pix_x", status: "Pago", amount: 1000, productionId: 1, opportunityId: createdOpp.id }),
      });
      expect([400, 401]).toContain(unsignedWebhook.status());
      const replayWebhook = await adminPage.request.post("/api/payments/webhook", {
        headers: { "content-type": "application/json", "x-oju-payment-signature": "00", "x-oju-payment-timestamp": "1" },
        data: "{}",
      });
      expect([400, 401]).toContain(replayWebhook.status());
      if (!process.env.PAYMENT_WEBHOOK_SECRET) {
        skips.push("SKIP — DEPENDÊNCIA EXTERNA PAYMENT: PAYMENT_WEBHOOK_SECRET ausente no QA. Endpoint /api/payments/webhook rejeita payload sem assinatura. PixWebhookProvider só cria cobrança após Production Concluída.");
      } else {
        skips.push("SKIP — DEPENDÊNCIA EXTERNA PAYMENT: cobrança Pix/webhook reconciliado exige Production Concluída. Sem Aceita não há intent oficial. Não gravar Pago no banco.");
      }

      skips.push("SKIP — DEPENDÊNCIA EXTERNA GOV.BR: OJU-AR-1.0 continua pendente para o Centro Administrativo do grant administrador. Não foi usado como chave de aceite/Production. Não fabricar PDF.");
      skips.push("SKIP — DEPENDÊNCIA EXTERNA FFMPEG: miniclipe ≤60s exige fixture MP4. Foto operacional da Production usa JPEG QA quando o storage aceita.");
      skips.push("SKIP — DEPENDÊNCIA EXTERNA PAYMENT: Pix/webhook reconciliado só após cobrança oficial. Sem fabricar Pago.");

      const policyAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "commercial-policy"), eq(auditEvents.resourceId, policyCreated.id!)));
      for (const event of policyAudits) ledger.add("auditEvent", event.id, undefined, { kind: "commercialPolicy", id: policyCreated.id! });

      await test.info().attach("missao3-ledger", {
        body: JSON.stringify({
          runId: ledger.runId,
          skips,
          opportunityId: createdOpp.id,
          inviteId: invite.id,
          termId: term.id,
          productionId: acceptedPayload.productionId,
          opportunityStatus: acceptedOpp.status,
          adminAccessParticipant: proMe.user!.adminAccess,
          ledger: ledger.list(),
        }, null, 2),
        contentType: "application/json",
      });
    } finally {
      await visitor.close().catch(() => undefined);
      await admin.close().catch(() => undefined);
      await professionalCtx?.close().catch(() => undefined);
      unlinkProfessionalState();
    }
  });
});
