import { and, eq, gte } from "drizzle-orm";
import type { Page } from "@playwright/test";
import {
  auditEvents,
  commercialPolicies,
  networkNotifications,
  networkOpportunities,
  networkOpportunityInvites,
  networkProductions,
  publicationMedia,
  publications,
  publicationTaxonomies,
} from "../../../drizzle/schema";
import { TERMS_OF_USE_VERSION } from "../../../shared/legalVersions";
import { expect, test } from "../../fixtures/cleanup";
import { waitTrpcPost } from "../../lib/journeys/trpcWait";
import { bootstrapOfficialParticipant, unlinkProfessionalState } from "../../lib/journeys/officialPartnerBootstrap";
import { registerOperationalCleanup } from "../../lib/operationalCleanup";
import { QA_JPEG_BYTES, QA_PNG_BYTES } from "../../lib/qaJpeg";
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

async function addJpegToAcervo(adminPage: Page, filename: string) {
  const chooserPromise = adminPage.waitForEvent("filechooser");
  await adminPage.getByRole("button", { name: "+ Adicionar fotos e vídeos" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: filename, mimeType: "image/jpeg", buffer: QA_JPEG_BYTES });
  await expect(adminPage.getByText("Fotos e vídeos selecionados: 1")).toBeVisible();
  const createMediaWait = waitTrpcPost(adminPage, "media.create");
  await expect(adminPage.getByRole("button", { name: "Adicionar ao Acervo", exact: true })).toBeEnabled();
  await adminPage.getByRole("button", { name: "Adicionar ao Acervo", exact: true }).click();
  const mediaResponse = await createMediaWait;
  expect(mediaResponse.status(), await mediaResponse.text()).toBeLessThan(400);
  const createdMedia = unwrapTrpcData(await mediaResponse.json()) as { id?: number };
  expect(createdMedia.id).toBeTruthy();
  await expect(adminPage.getByText(filename, { exact: true })).toBeVisible();
  await expect(adminPage.getByText("Fotos e vídeos selecionados: 0")).toBeVisible();
  return createdMedia.id!;
}

test.describe.configure({ mode: "serial" });

test.describe("MISSÃO 2 — Opportunity → Production → Media → Editorial → Financeiro", () => {
  test("Super Admin opera a cadeia oficial; profissional aceita Opportunity sem gov.br", async ({
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
      const visitorDenied = await trpcMutation(visitor.request, "opportunities.create", {
        title: "QA visitante",
        briefing: "Visitante não cria Opportunity.",
        workType: "Fotografia",
        territoryId: 1,
        totalValue: 100,
        specialtyIds: ["fotografo"],
      });
      expect(denied(visitorDenied.status, visitorDenied.body)).toBe(true);

      const boot = await bootstrapOfficialParticipant({ browser, admin, ledger, visitorPage });
      professionalCtx = boot.professionalCtx;
      const adminPage = boot.adminPage;
      const adminApi = admin.request;
      const proApi = professionalCtx.request;
      const db = await requireQaDb();
      const runStartedAt = new Date();

      const proCreate = await trpcMutation(proApi, "opportunities.create", {
        title: `QA ${ledger.runId} indevido`,
        briefing: "Participante sem adminAccess não cria Opportunity.",
        workType: "Fotografia",
        territoryId: boot.territoryId,
        totalValue: 100,
        specialtyIds: ["fotografo"],
        partnerId: boot.partnerId,
      });
      expect(denied(proCreate.status, proCreate.body), "participante não cria Opportunity").toBe(true);

      const proMediaDenied = await trpcMutation(proApi, "media.create", {
        mediaType: "foto",
        assetUrl: "http://127.0.0.1:3100/media-storage/qa-indevido.jpg",
        origin: "Operação Ojú",
        credit: "Equipe Ojú",
        authorization: "Autoral própria",
        purpose: "Uso editorial",
        publicationAllowed: true,
      });
      expect(denied(proMediaDenied.status, proMediaDenied.body), "participante sem adminAccess não cria Acervo").toBe(true);

      await adminPage.goto("/admin/politicas-comerciais", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Políticas comerciais versionadas." })).toBeVisible();
      await adminPage.getByLabel("Modalidade").selectOption("Fotografia");
      await adminPage.getByLabel("Nome da política").fill(`QA AUTO fotografia ${ledger.runId}`);
      await adminPage.getByLabel("Válida a partir de").fill("2020-01-01");
      await adminPage.getByLabel("Ojú (%)").fill("12");
      await adminPage.getByLabel("Desenvolvimento (%)").fill("0");
      await adminPage.getByLabel("Captação (%)").fill("0");
      await adminPage.getByLabel("Executor (%)").fill("88");
      const policyWait = waitTrpcPost(adminPage, "financial.createPolicy");
      await adminPage.getByRole("button", { name: "Criar versão em rascunho" }).click();
      const policyResponse = await policyWait;
      expect(policyResponse.status()).toBeLessThan(400);
      const policyCreated = unwrapTrpcData(await policyResponse.json()) as { id?: number };
      expect(policyCreated.id).toBeTruthy();
      ledger.add("commercialPolicy", policyCreated.id!);
      const policyCard = adminPage.locator("article").filter({ hasText: `QA AUTO fotografia ${ledger.runId}` });
      await expect(policyCard).toBeVisible();
      const activateWait = waitTrpcPost(adminPage, "financial.activatePolicy");
      await policyCard.getByRole("button", { name: "Ativar esta versão" }).click();
      expect((await activateWait).status()).toBeLessThan(400);
      const policyRow = (await db.select().from(commercialPolicies).where(eq(commercialPolicies.id, policyCreated.id!)).limit(1))[0];
      expect(policyRow.status).toBe("Ativa");
      expect(policyRow.scope).toBe("Fotografia");
      expect(Number(policyRow.executorPercent)).toBe(88);
      const livePolicy = await trpcQuery(adminApi, "financial.activePolicy", { scope: "Fotografia" });
      expect(trpcErrorCode(livePolicy.body)).toBeUndefined();
      expect((unwrapTrpcData(livePolicy.body) as { id?: number } | null)?.id).toBe(policyCreated.id);
      const policyAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "commercial-policy"), eq(auditEvents.resourceId, policyCreated.id!)));
      expect(policyAudits.length).toBeGreaterThan(0);
      for (const event of policyAudits) ledger.add("auditEvent", event.id, undefined, { kind: "commercialPolicy", id: policyCreated.id! });

      const featuredBefore = await trpcQuery(adminApi, "editorial.featured", {});
      const featuredCountBefore = ((unwrapTrpcData(featuredBefore.body) as unknown[]) || []).length;

      await adminPage.goto("/admin/oportunidades", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Oportunidades territoriais." })).toBeVisible();
      const oppTitle = `Cobertura ${ledger.runId}`;
      await adminPage.getByPlaceholder("Ex.: Cobertura fotográfica em Manaus").fill(oppTitle);
      await adminPage.getByPlaceholder("Briefing operacional. Sem dados administrativos desnecessários.").fill(`Briefing operacional ${ledger.runId} para Opportunity oficial.`);
      await adminPage.locator("select[name='workType']").selectOption("Fotografia");
      await expect(adminPage.locator("select[name='workType']")).toHaveValue("Fotografia");
      const scopeValue = `${boot.partnerId}:${boot.territoryId}`;
      await expect(adminPage.locator(`select[name='scope'] option[value="${scopeValue}"]`)).toHaveCount(1, { timeout: 20_000 });
      await adminPage.locator("select[name='scope']").selectOption(scopeValue);
      await adminPage.getByPlaceholder("Valor total previsto").fill("1000");
      await adminPage.locator("label").filter({ hasText: "Fotógrafo" }).locator('input[type="checkbox"]').check();
      const createOppWait = waitTrpcPost(adminPage, "opportunities.create");
      await adminPage.getByRole("button", { name: "Criar rascunho" }).click();
      const createOppResponse = await createOppWait;
      expect(createOppResponse.status(), await createOppResponse.text()).toBeLessThan(400);
      const createdOpp = unwrapTrpcData(await createOppResponse.json()) as { id?: number; commercialPolicyId?: number; commercialPolicyVersion?: number };
      expect(createdOpp.id).toBeTruthy();
      ledger.add("opportunity", createdOpp.id!);
      expect(createdOpp.commercialPolicyId).toBe(policyCreated.id);
      const oppRow = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, createdOpp.id!)).limit(1))[0];
      expect(oppRow.status).toBe("Rascunho");
      expect(oppRow.createdBy).toBe((await readAuthMe(adminApi)).user!.id);
      expect(oppRow.territoryId).toBe(boot.territoryId);
      expect(oppRow.partnerId).toBe(boot.partnerId);
      expect(Number(oppRow.professionalValue)).toBe(880);
      const oppCard = adminPage.locator("article").filter({ hasText: oppTitle });
      await expect(oppCard).toBeVisible();
      await oppCard.getByRole("button", { name: "Ver matching" }).click();
      const inviteBtn = oppCard.getByRole("button", { name: new RegExp(`Convidar ${boot.displayName}`) });
      await expect(inviteBtn).toBeVisible();
      const inviteWait = waitTrpcPost(adminPage, "opportunities.invite");
      await inviteBtn.click();
      expect((await inviteWait).status()).toBeLessThan(400);
      const opened = (await db.select().from(networkOpportunities).where(eq(networkOpportunities.id, createdOpp.id!)).limit(1))[0];
      expect(opened.status).toBe("Aberta");
      const invite = (await db.select().from(networkOpportunityInvites).where(eq(networkOpportunityInvites.opportunityId, createdOpp.id!)).limit(1))[0];
      expect(invite.status).toBe("Pendente");
      expect(invite.professionalProfileId).toBe(boot.profileId);
      const inviteNotifs = await db.select({ id: networkNotifications.id }).from(networkNotifications).where(and(eq(networkNotifications.referenceType, "network-opportunity"), eq(networkNotifications.referenceId, createdOpp.id!)));
      for (const notif of inviteNotifs) ledger.add("notification", notif.id, undefined, { kind: "opportunity", id: createdOpp.id! });

      const wrongTerritory = await trpcMutation(adminApi, "opportunities.create", {
        title: `Fora ${ledger.runId}`,
        briefing: "Território inexistente não deve gravar Opportunity.",
        workType: "Fotografia",
        territoryId: 999_999_001,
        totalValue: 100,
        specialtyIds: ["fotografo"],
        partnerId: boot.partnerId,
      });
      expect(wrongTerritory.status >= 400 || Boolean(trpcErrorCode(wrongTerritory.body))).toBe(true);

      const oppAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "network-opportunity"), eq(auditEvents.resourceId, createdOpp.id!)));
      expect(oppAudits.length).toBeGreaterThan(0);
      for (const event of oppAudits) ledger.add("auditEvent", event.id, undefined, { kind: "opportunity", id: createdOpp.id! });

      const termsOk = await trpcMutation(proApi, "legal.accept", { documentVersion: TERMS_OF_USE_VERSION, context: "network-operation" });
      expect(termsOk.status, `legal.accept ${trpcErrorCode(termsOk.body)} ${trpcErrorMessage(termsOk.body)}`).toBeLessThan(400);
      const acceptOk = await trpcMutation(proApi, "opportunities.accept", { inviteId: invite.id });
      expect(acceptOk.status, `opportunities.accept ${trpcErrorCode(acceptOk.body)} ${trpcErrorMessage(acceptOk.body)}`).toBeLessThan(400);
      expect(trpcErrorCode(acceptOk.body)).toBeUndefined();
      const accepted = unwrapTrpcData(acceptOk.body) as { productionId?: number | null };
      expect(accepted.productionId).toBeTruthy();
      ledger.add("production", accepted.productionId!);
      const proPage = await professionalCtx.newPage();
      await proPage.goto("/admin/oportunidades", { waitUntil: "domcontentloaded" });
      await expect(proPage.getByRole("heading", { name: "Acesso não autorizado" })).toBeVisible();
      await proPage.goto("/rede/convites", { waitUntil: "domcontentloaded" });
      await expect(proPage.getByRole("heading", { name: "Convites" })).toBeVisible();
      skips.push("PASS aceite sem gov.br. OJU-AR permanece só para CMS territorial. Sem fabricar termo.");

      const createAgain = await trpcMutation(adminApi, "productions.createFromOpportunity", { opportunityId: createdOpp.id! });
      expect(createAgain.status).toBeLessThan(400);
      const productions = await db.select({ id: networkProductions.id }).from(networkProductions).where(eq(networkProductions.opportunityId, createdOpp.id!));
      expect(productions.length).toBe(1);
      const prodAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "network-production"), eq(auditEvents.resourceId, accepted.productionId!)));
      for (const event of prodAudits) ledger.add("auditEvent", event.id, undefined, { kind: "production", id: accepted.productionId! });
      skips.push("Production Planejada nasceu no aceite. 5+1 editorial desta jornada segue no CMS Super Admin, separado da Production.");

      await adminPage.goto("/admin/midias", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Enviar e deixar pronta para o conteúdo." })).toBeVisible();
      const origin = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";
      const uploadHeaders = (contentType: string, filename: string) => ({
        origin,
        "content-type": contentType,
        "x-file-name": filename,
        "x-partner-id": String(boot.partnerId),
        "x-territory-id": String(boot.territoryId),
      });
      const pngUpload = await adminPage.request.post("/api/media/upload", {
        headers: uploadHeaders("image/png", "falso.png"),
        data: QA_PNG_BYTES,
      });
      expect(pngUpload.status(), await pngUpload.text()).toBe(415);
      const disguised = await adminPage.request.post("/api/media/upload", {
        headers: uploadHeaders("image/jpeg", "disfarce.jpg"),
        data: QA_PNG_BYTES,
      });
      expect(disguised.status(), await disguised.text()).toBe(415);
      const garbage = await adminPage.request.post("/api/media/upload", {
        headers: uploadHeaders("image/jpeg", "lixo.jpg"),
        data: Buffer.from("not-an-image"),
      });
      expect(garbage.status(), await garbage.text()).toBe(415);
      const fakeVideo = await adminPage.request.post("/api/media/upload", {
        headers: uploadHeaders("video/mp4", "falso.mp4"),
        data: QA_JPEG_BYTES,
      });
      expect([400, 415]).toContain(fakeVideo.status());

      const mediaIds: number[] = [];
      const mediaFiles: string[] = [];
      for (let index = 0; index < 6; index += 1) {
        const filename = `qa-auto-${ledger.runId}-${index}.jpg`;
        const mediaId = await addJpegToAcervo(adminPage, filename);
        ledger.add("mediaAsset", mediaId);
        mediaIds.push(mediaId);
        mediaFiles.push(filename);
      }
      expect(mediaIds).toHaveLength(6);
      const adminUserId = (await readAuthMe(adminApi)).user!.id;
      const uploadAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.actorId, adminUserId), eq(auditEvents.action, "upload-ready"), gte(auditEvents.createdAt, runStartedAt)));
      for (const event of uploadAudits) ledger.add("auditEvent", event.id);
      skips.push("SKIP — DEPENDÊNCIA EXTERNA: laboratório sem ffmpeg/fixture MP4. MIME/magic bytes inválidos de vídeo já falham (415/400). Miniclipe ≤60s, segundo miniclipe e vídeo >60s exigem arquivo de vídeo verdadeiro no upload.");

      await adminPage.goto("/admin/publicacoes?novo=1", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Criar e publicar." })).toBeVisible();
      await adminPage.getByRole("button", { name: "História", exact: true }).click();
      const pubTitle = `História ${ledger.runId}`;
      await adminPage.getByPlaceholder("Nome no portal").fill(pubTitle);
      const createPubWait = waitTrpcPost(adminPage, "editorial.create");
      await adminPage.getByRole("button", { name: "Começar" }).click();
      const createPubResponse = await createPubWait;
      expect(createPubResponse.status()).toBeLessThan(400);
      const createdPub = unwrapTrpcData(await createPubResponse.json()) as { id?: number; slug?: string };
      expect(createdPub.id).toBeTruthy();
      ledger.add("publication", createdPub.id!);
      await expect(adminPage).toHaveURL(new RegExp(`/admin/editar/${createdPub.id}`));
      await adminPage.locator("#texto textarea").fill(`Texto documental ${ledger.runId} para o portal. Sem destaque automático.`);
      const saveText = waitTrpcPost(adminPage, "editorial.update");
      await adminPage.getByRole("button", { name: "Continuar" }).click();
      expect((await saveText).status()).toBeLessThan(400);
      await expect(adminPage.getByRole("heading", { name: "Cidade de atuação" })).toBeVisible();
      const cityBox = adminPage.locator("label").filter({ hasText: boot.cityName });
      if ((await cityBox.count()) > 0) {
        await cityBox.locator("button, input").first().click();
        const saveCity = waitTrpcPost(adminPage, "editorial.update");
        await adminPage.getByRole("button", { name: "Salvar relações documentais" }).click();
        expect((await saveCity).status()).toBeLessThan(400);
        await expect(adminPage.getByText("Relações documentais salvas.").last()).toBeVisible();
        await expect(adminPage.getByText("Falta foto ou vídeo autorizado.")).toBeVisible();
      } else {
        await adminPage.locator("section").filter({ hasText: "Relações documentais" }).locator("select").first().selectOption("AM");
        await adminPage.locator("section").filter({ hasText: "Relações documentais" }).locator("select").nth(1).selectOption("outro");
        await adminPage.getByPlaceholder("Escreva a cidade de atuação").fill(boot.cityName);
        const linkCity = waitTrpcPost(adminPage, "editorial.createTaxonomy");
        await adminPage.getByRole("button", { name: "Cadastrar e ligar" }).first().click();
        expect((await linkCity).status()).toBeLessThan(400);
      }
      await adminPage.getByRole("button", { name: "Capa e publicar" }).click();
      await expect(adminPage.getByRole("heading", { name: "Capa" })).toBeVisible();

      for (let index = 0; index < 5; index += 1) {
        const card = adminPage.locator("div.flex.items-center.justify-between").filter({ hasText: mediaFiles[index] });
        await expect(card).toHaveCount(1);
        const attachWait = waitTrpcPost(adminPage, "editorial.attachMedia");
        await card.getByRole("button", { name: index === 0 ? "Capa" : "Vincular" }).click();
        expect((await attachWait).status()).toBeLessThan(400);
        await expect(adminPage.getByText(index === 0 ? "Esta foto é a capa do conteúdo." : "Mídia vinculada ao conteúdo.").last()).toBeVisible();
      }
      const sixthCard = adminPage.locator("div.flex.items-center.justify-between").filter({ hasText: mediaFiles[5] });
      await expect(sixthCard.getByRole("button", { name: "Vincular" })).toBeDisabled();
      const sixth = await trpcMutation(adminApi, "editorial.attachMedia", {
        publicationId: createdPub.id,
        mediaId: mediaIds[5],
      });
      expect(sixth.status >= 400 || Boolean(trpcErrorCode(sixth.body)), "backend nega a 6ª foto na mesma unidade").toBe(true);
      const links = await db.select().from(publicationMedia).where(eq(publicationMedia.publicationId, createdPub.id!));
      expect(links.length).toBe(5);
      await adminPage.getByRole("button", { name: "2. Cidade" }).click();
      const cityToggle = adminPage.locator("label").filter({ hasText: boot.cityName }).locator("button").first();
      if ((await cityToggle.getAttribute("data-state")) !== "checked") await cityToggle.click();
      await expect(cityToggle).toHaveAttribute("data-state", "checked");
      const saveCityAgain = waitTrpcPost(adminPage, "editorial.update");
      await adminPage.getByRole("button", { name: "Salvar relações documentais" }).click();
      expect((await saveCityAgain).status()).toBeLessThan(400);
      const cityLinks = await db.select().from(publicationTaxonomies).where(eq(publicationTaxonomies.publicationId, createdPub.id!));
      expect(cityLinks.length).toBeGreaterThan(0);
      await adminPage.getByRole("button", { name: "3. Capa e publicar" }).click();
      await expect(adminPage.getByText("Pronto. Publique no site.")).toBeVisible();
      await expect(adminPage.getByRole("button", { name: "Publicar no site" })).toBeEnabled();
      const publishWait = waitTrpcPost(adminPage, "editorial.publishDirect");
      await adminPage.getByRole("button", { name: "Publicar no site" }).click();
      expect((await publishWait).status()).toBeLessThan(400);
      const published = (await db.select().from(publications).where(eq(publications.id, createdPub.id!)).limit(1))[0];
      expect(published.status).toBe("Publicada");
      expect(published.isPublic).toBe(true);
      const pubAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "publication"), eq(auditEvents.resourceId, createdPub.id!)));
      expect(pubAudits.length).toBeGreaterThan(0);
      for (const event of pubAudits) ledger.add("auditEvent", event.id, undefined, { kind: "publication", id: createdPub.id! });

      await visitorPage.goto(`/historias/${published.slug}`, { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByRole("heading", { name: pubTitle })).toBeVisible();
      const featuredAfter = await trpcQuery(visitor.request, "editorial.featured", {});
      const featuredCountAfter = ((unwrapTrpcData(featuredAfter.body) as unknown[]) || []).length;
      expect(featuredCountAfter, "publicar não coloca na Home").toBe(featuredCountBefore);

      await adminPage.goto("/admin/publicacoes", { waitUntil: "domcontentloaded" });
      const pubRow = adminPage.locator("tr, article").filter({ hasText: pubTitle });
      const unpublishWait = waitTrpcPost(adminPage, "editorial.unpublish");
      await pubRow.getByRole("button", { name: "Tirar do ar" }).first().click();
      expect((await unpublishWait).status()).toBeLessThan(400);
      const afterUnpublish = (await db.select().from(publications).where(eq(publications.id, createdPub.id!)).limit(1))[0];
      expect(afterUnpublish.isPublic).toBe(false);
      await visitorPage.goto(`/historias/${published.slug}`, { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByRole("heading", { name: "Conteúdo indisponível." })).toBeVisible();

      await adminPage.goto("/admin/publicacoes?novo=1", { waitUntil: "domcontentloaded" });
      await adminPage.getByRole("button", { name: "História", exact: true }).click();
      const pubTitle2 = `História B ${ledger.runId}`;
      await adminPage.getByPlaceholder("Nome no portal").fill(pubTitle2);
      const createPub2Wait = waitTrpcPost(adminPage, "editorial.create");
      await adminPage.getByRole("button", { name: "Começar" }).click();
      const createdPub2 = unwrapTrpcData(await (await createPub2Wait).json()) as { id?: number };
      expect(createdPub2.id).toBeTruthy();
      ledger.add("publication", createdPub2.id!);
      await adminPage.locator("#texto textarea").fill(`Segunda unidade editorial ${ledger.runId}. Janela 5+1 própria.`);
      await adminPage.getByRole("button", { name: "Continuar" }).click();
      await expect(adminPage.getByRole("heading", { name: "Cidade de atuação" })).toBeVisible();
      const cityBox2 = adminPage.locator("label").filter({ hasText: boot.cityName });
      await cityBox2.locator("button, input").first().click();
      const saveCity2 = waitTrpcPost(adminPage, "editorial.update");
      await adminPage.getByRole("button", { name: "Salvar relações documentais" }).click();
      expect((await saveCity2).status()).toBeLessThan(400);
      await expect(adminPage.getByText("Relações documentais salvas.").last()).toBeVisible();
      await adminPage.getByRole("button", { name: "Capa e publicar" }).click();
      await expect(adminPage.getByRole("heading", { name: "Capa" })).toBeVisible();
      const secondUnitCard = adminPage.locator("div.flex.items-center.justify-between").filter({ hasText: mediaFiles[5] });
      const attach2 = waitTrpcPost(adminPage, "editorial.attachMedia");
      await secondUnitCard.getByRole("button", { name: "Capa" }).click();
      expect((await attach2).status()).toBeLessThan(400);
      const links2 = await db.select().from(publicationMedia).where(eq(publicationMedia.publicationId, createdPub2.id!));
      expect(links2.length, "5+1 é por unidade editorial, não quota global").toBe(1);
      const pub2Audits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "publication"), eq(auditEvents.resourceId, createdPub2.id!)));
      for (const event of pub2Audits) ledger.add("auditEvent", event.id, undefined, { kind: "publication", id: createdPub2.id! });

      await test.info().attach("missao2-ledger", {
        body: JSON.stringify({
          runId: ledger.runId,
          skips,
          opportunityId: createdOpp.id,
          publicationId: createdPub.id,
          publicationId2: createdPub2.id,
          mediaIds,
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
