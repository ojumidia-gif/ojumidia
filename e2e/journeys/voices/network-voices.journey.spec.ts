import { and, eq } from "drizzle-orm";
import { auditEvents, networkVoices } from "../../../drizzle/schema";
import { expect, test } from "../../fixtures/cleanup";
import { waitTrpcPost } from "../../lib/journeys/trpcWait";
import { registerNetworkVoicesCleanup } from "../../lib/networkVoicesCleanup";
import { requireQaDb } from "../../lib/qaDb";
import { qaMutationReadiness } from "../../lib/qaReadiness";
import { assertQaMysqlTarget } from "../../lib/qaTarget";
import { hasPersonaState, personaStatePath } from "../../personas";
import { denied, trpcErrorCode, trpcErrorMessage, trpcMutation, trpcQuery, unwrapTrpcData } from "../../support";

const readiness = qaMutationReadiness();

test.describe.configure({ mode: "serial" });

test.describe("Vozes da Rede — envio, análise, publicação e curadoria no QA", () => {
  test("visitante envia; Super Admin analisa; publicação ≠ curadoria; teardown", async ({ browser, ledger, page }) => {
    test.setTimeout(180_000);
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);
    expect(readiness.guard.allowed, readiness.guard.reason).toBe(true);
    expect(hasPersonaState("superAdmin"), "ABORTADO: capture Super Admin QA.").toBe(true);

    registerNetworkVoicesCleanup(ledger);
    const body = `Depoimento documental ${ledger.runId} sobre o cuidado no registro. Sem avaliação comercial.`;

    await page.goto("/vozes-da-rede", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Vozes da Rede Ojú" })).toBeVisible();
    await page.getByRole("textbox", { name: "Depoimento" }).fill(body);
    await page.getByLabel("Identificação pública (opcional)").fill(`Voz ${ledger.runId}`);
    await page.getByLabel("Como identificar").selectOption("Nome");
    await page.getByLabel("E-mail para a equipe").fill(`qa.auto.${ledger.runId.replace(/[^a-z0-9]/gi, "")}@ojumidia.com.br`);
    await page.locator("label").filter({ hasText: "Autorizo a análise editorial" }).locator("input").check();
    const submitWait = waitTrpcPost(page, "networkVoices.submit");
    await page.getByRole("button", { name: "Enviar para análise" }).click();
    const submitResponse = await submitWait;
    const submitBody = await submitResponse.json();
    expect(submitResponse.status(), `${trpcErrorCode(submitBody)} ${trpcErrorMessage(submitBody)}`).toBeLessThan(400);
    await expect(page.getByText("Recebemos o envio.")).toBeVisible();

    const db = await requireQaDb();
    const row = (await db.select().from(networkVoices).where(eq(networkVoices.body, body)).limit(1))[0];
    expect(row, "envio não persistiu").toBeTruthy();
    expect(row.status).toBe("Aguardando análise");
    ledger.add("networkVoice", row.id);
    const submitAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "network-voice"), eq(auditEvents.resourceId, row.id)));
    for (const event of submitAudits) ledger.add("auditEvent", event.id, undefined, { kind: "networkVoice", id: row.id });

    const visitorPublic = await trpcQuery(page.request, "networkVoices.publicPublished");
    expect(visitorPublic.status).toBeLessThan(400);
    const publishedBefore = unwrapTrpcData(visitorPublic.body) as { curated: Array<{ id: number }>; published: Array<{ id: number }> };
    expect(publishedBefore.curated.some(item => item.id === row.id)).toBe(false);
    expect(publishedBefore.published.some(item => item.id === row.id)).toBe(false);

    const visitorList = await trpcQuery(page.request, "networkVoices.list", undefined, { intent: "auth-probe" });
    expect(denied(visitorList.status, visitorList.body)).toBe(true);
    const visitorDecide = await trpcMutation(page.request, "networkVoices.decide", { id: row.id, action: "approve" });
    expect(denied(visitorDecide.status, visitorDecide.body)).toBe(true);

    const admin = await browser.newContext({ storageState: personaStatePath("superAdmin") });
    try {
      const adminApi = admin.request;
      const adminPage = await admin.newPage();
      await adminPage.goto("/admin/vozes", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Análise, publicação e curadoria documental." })).toBeVisible();
      await expect(adminPage.getByText(body)).toBeVisible();

      const adjust = await trpcMutation(adminApi, "networkVoices.decide", { id: row.id, action: "requestAdjustment", note: "Ajuste de contexto." });
      expect(adjust.status, trpcErrorCode(adjust.body) || "").toBeLessThan(400);
      expect(unwrapTrpcData(adjust.body)).toMatchObject({ status: "Ajuste solicitado" });

      const resubmit = await trpcMutation(adminApi, "networkVoices.decide", { id: row.id, action: "resubmit" });
      expect(resubmit.status).toBeLessThan(400);

      const approve = await trpcMutation(adminApi, "networkVoices.decide", { id: row.id, action: "approve" });
      expect(approve.status).toBeLessThan(400);
      const stillHidden = unwrapTrpcData((await trpcQuery(page.request, "networkVoices.publicPublished")).body) as { published: Array<{ id: number }> };
      expect(stillHidden.published.some(item => item.id === row.id)).toBe(false);

      const publish = await trpcMutation(adminApi, "networkVoices.decide", { id: row.id, action: "publish" });
      expect(publish.status).toBeLessThan(400);
      const afterPublish = unwrapTrpcData((await trpcQuery(page.request, "networkVoices.publicPublished")).body) as {
        curated: Array<{ id: number; nationallyCurated?: boolean }>;
        published: Array<{ id: number }>;
      };
      expect(afterPublish.published.some(item => item.id === row.id)).toBe(true);
      expect(afterPublish.curated.some(item => item.id === row.id)).toBe(false);

      const territorial = await trpcMutation(adminApi, "networkVoices.setCuration", { id: row.id, curationScope: "Territorial" });
      expect(territorial.status).toBeLessThan(400);
      const afterTerritorial = unwrapTrpcData((await trpcQuery(page.request, "networkVoices.publicPublished")).body) as {
        curated: Array<{ id: number }>;
        published: Array<{ id: number }>;
      };
      expect(afterTerritorial.curated.some(item => item.id === row.id)).toBe(false);
      expect(afterTerritorial.published.some(item => item.id === row.id)).toBe(true);

      const national = await trpcMutation(adminApi, "networkVoices.setCuration", { id: row.id, curationScope: "Nacional" });
      expect(national.status).toBeLessThan(400);
      const afterNational = unwrapTrpcData((await trpcQuery(page.request, "networkVoices.publicPublished")).body) as {
        curated: Array<{ id: number }>;
      };
      expect(afterNational.curated.some(item => item.id === row.id)).toBe(true);

      if (hasPersonaState("territorialAdmin")) {
        const territorialCtx = await browser.newContext({ storageState: personaStatePath("territorialAdmin") });
        try {
          const steal = await trpcMutation(territorialCtx.request, "networkVoices.setCuration", { id: row.id, curationScope: "Nacional" });
          expect(denied(steal.status, steal.body), "admin territorial não faz curadoria nacional").toBe(true);
          const list = unwrapTrpcData((await trpcQuery(territorialCtx.request, "networkVoices.list")).body) as Array<{ id: number }>;
          expect(list.some(item => item.id === row.id), "depoimento sem território do parceiro não entra na carteira territorial").toBe(false);
        } finally {
          await territorialCtx.close();
        }
      }

      const uncurate = await trpcMutation(adminApi, "networkVoices.setCuration", { id: row.id, curationScope: "Nenhum" });
      expect(uncurate.status).toBeLessThan(400);
      const unpublish = await trpcMutation(adminApi, "networkVoices.decide", { id: row.id, action: "unpublish" });
      expect(unpublish.status).toBeLessThan(400);
      const afterUnpublish = unwrapTrpcData((await trpcQuery(page.request, "networkVoices.publicPublished")).body) as {
        curated: Array<{ id: number }>;
        published: Array<{ id: number }>;
      };
      expect(afterUnpublish.curated.some(item => item.id === row.id)).toBe(false);
      expect(afterUnpublish.published.some(item => item.id === row.id)).toBe(false);

      const reopen = await trpcMutation(adminApi, "networkVoices.decide", { id: row.id, action: "reopen" });
      expect(reopen.status).toBeLessThan(400);
      const reject = await trpcMutation(adminApi, "networkVoices.decide", { id: row.id, action: "reject", note: "Fora do escopo documental." });
      expect(reject.status).toBeLessThan(400);
      expect(unwrapTrpcData(reject.body)).toMatchObject({ status: "Rejeitado" });

      const leftoverAudits = await db.select().from(auditEvents).where(and(eq(auditEvents.resourceType, "network-voice"), eq(auditEvents.resourceId, row.id)));
      for (const event of leftoverAudits) ledger.add("auditEvent", event.id, undefined, { kind: "networkVoice", id: row.id });
    } finally {
      await admin.close();
    }
  });
});
