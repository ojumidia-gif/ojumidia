import { eq } from "drizzle-orm";
import type { APIRequestContext } from "@playwright/test";
import { mediaAssets, networkProductionMedia } from "../../../drizzle/schema";
import { expect, test } from "../../fixtures/cleanup";
import { waitTrpcPost } from "../../lib/journeys/trpcWait";
import { registerOperationalCleanup } from "../../lib/operationalCleanup";
import { QA_JPEG_BYTES } from "../../lib/qaJpeg";
import { requireQaDb } from "../../lib/qaDb";
import { qaMutationReadiness } from "../../lib/qaReadiness";
import { assertQaMysqlTarget } from "../../lib/qaTarget";
import { hasPersonaState, personaStatePath } from "../../personas";
import type { TestLedger } from "../../lib/testLedger";
import { MEDIA_IN_PUBLIC_USE_ARCHIVE_MESSAGE } from "../../../shared/acervoFlow";
import {
  denied,
  trpcErrorCode,
  trpcErrorMessage,
  trpcMutation,
  trpcQuery,
  unwrapTrpcData,
} from "../../support";

const readiness = qaMutationReadiness();
test.use({ channel: "chrome" });

async function createMedia(adminApi: APIRequestContext, origin: string, filename: string, options?: { publicationAllowed?: boolean; approve?: boolean }) {
  const upload = await adminApi.post("/api/media/upload", {
    headers: { origin, "content-type": "image/jpeg", "x-file-name": filename },
    data: QA_JPEG_BYTES,
  });
  expect(upload.status(), await upload.text()).toBeLessThan(400);
  const uploaded = (await upload.json()) as { url?: string; key?: string; filename?: string; uploadId?: string };
  const media = await trpcMutation(adminApi, "media.create", {
    mediaType: "foto",
    assetUrl: uploaded.url,
    storageKey: uploaded.key,
    filename: uploaded.filename || filename,
    origin: "Operação Ojú QA",
    credit: "Equipe Ojú",
    authorization: "Autoral própria",
    purpose: "Fluxo do Acervo QA",
    publicationAllowed: options?.publicationAllowed ?? true,
    uploadId: uploaded.uploadId,
  });
  expect(media.status, `${trpcErrorCode(media.body)} ${trpcErrorMessage(media.body)}`).toBeLessThan(400);
  const mediaId = (unwrapTrpcData(media.body) as { id: number }).id;
  if (options?.approve !== false && (options?.publicationAllowed ?? true)) {
    const approve = await trpcMutation(adminApi, "media.approveUpload", { id: mediaId });
    expect(approve.status, trpcErrorMessage(approve.body) || "").toBeLessThan(400);
  }
  return { id: mediaId, uploadId: uploaded.uploadId };
}

function trackMedia(ledger: TestLedger, created: { id: number; uploadId?: string }) {
  ledger.add("mediaAsset", created.id);
  if (created.uploadId) ledger.add("other", `upload-session:${created.uploadId}`);
  return created.id;
}

test.describe("Fluxo do Acervo interno — estados, ligação, retirar de uso e purge", () => {
  test("CMS, API e cleanup no QA isolado", async ({ browser, ledger }) => {
    test.setTimeout(360_000);
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);
    expect(readiness.guard.allowed, readiness.guard.reason).toBe(true);
    expect(process.env.S3_BUCKET || "", "Tigris/S3 não pode estar no QA").toBe("");
    expect(hasPersonaState("superAdmin"), "ABORTADO: capture Super Admin QA.").toBe(true);

    registerOperationalCleanup(ledger);
    const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const admin = await browser.newContext({ storageState: personaStatePath("superAdmin") });

    try {
      const visitorPage = await visitor.newPage();
      const adminPage = await admin.newPage();
      const adminApi = admin.request;
      const visitorApi = visitor.request;
      const db = await requireQaDb();
      const origin = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";
      const visitorList = await trpcQuery(visitorApi, "media.list", { limit: 8, offset: 0 });
      expect(denied(visitorList.status, visitorList.body), "visitante não lista o Acervo").toBe(true);
      const visitorArchive = await trpcMutation(visitorApi, "media.archive", { id: 1 });
      expect(denied(visitorArchive.status, visitorArchive.body), "visitante não retira de uso").toBe(true);
      const visitorAttach = await trpcMutation(visitorApi, "editorial.attachMedia", { publicationId: 1, mediaId: 1 });
      expect(denied(visitorAttach.status, visitorAttach.body), "visitante não liga mídia").toBe(true);

      await adminPage.goto("/admin/publicacoes?novo=1&tipo=História", { waitUntil: "domcontentloaded" });
      const title = `QA-ACERVO ${ledger.runId}`;
      await adminPage.getByRole("button", { name: "História", exact: true }).click();
      await adminPage.getByPlaceholder("Nome no portal").fill(title);
      const createWait = waitTrpcPost(adminPage, "editorial.create");
      await adminPage.getByRole("button", { name: "Começar" }).click();
      const created = unwrapTrpcData(await (await createWait).json()) as { id?: number; slug?: string };
      expect(created.id).toBeTruthy();
      ledger.add("publication", created.id!);

      const filename = `qa-acervo-${ledger.runId}.jpg`;
      const mediaId = trackMedia(ledger, await createMedia(adminApi, origin, filename));
      const purgeMediaId = trackMedia(ledger, await createMedia(adminApi, origin, `qa-acervo-purge-${ledger.runId}.jpg`));

      const listBefore = unwrapTrpcData((await trpcQuery(adminApi, "media.list", { limit: 40, offset: 0 })).body) as { items: Array<{ id: number; usages?: unknown[]; origin?: string }> };
      const listed = listBefore.items.find(item => item.id === mediaId);
      expect(listed?.usages || []).toEqual([]);

      await adminPage.goto("/admin/midias", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("main").getByText("Acervo interno", { exact: true })).toBeVisible();
      await expect(adminPage.getByText(filename, { exact: false })).toBeVisible();
      await expect(adminPage.getByText("Ainda sem conteúdo").first()).toBeVisible();
      await expect(adminPage.getByRole("button", { name: "Ligar a um conteúdo" }).first()).toBeVisible();
      await expect(adminPage.getByRole("button", { name: "Editar dados" }).first()).toBeVisible();
      await expect(adminPage.getByRole("button", { name: "Retirar de uso" }).first()).toBeVisible();

      const updated = await trpcMutation(adminApi, "media.update", {
        id: mediaId,
        origin: "Nota QA sem vínculo",
        credit: "Equipe Ojú",
        authorization: "Autoral própria",
        purpose: "Fluxo do Acervo QA",
        publicationAllowed: true,
        partnerId: 999999,
        territoryId: 999999,
      });
      expect(updated.status, trpcErrorMessage(updated.body) || "").toBeLessThan(400);
      const afterEdit = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1))[0];
      expect(afterEdit.origin).toBe("Nota QA sem vínculo");
      expect(afterEdit.partnerId ?? null).not.toBe(999999);

      const usagesAfterEdit = unwrapTrpcData((await trpcQuery(adminApi, "media.usages", { id: mediaId })).body) as unknown[];
      expect(usagesAfterEdit).toEqual([]);

      const archiveFree = await trpcMutation(adminApi, "media.archive", { id: mediaId });
      expect(archiveFree.status, trpcErrorMessage(archiveFree.body) || "").toBeLessThan(400);
      const archivedAttach = await trpcMutation(adminApi, "editorial.attachMedia", { publicationId: created.id, mediaId });
      expect(archivedAttach.status >= 400 || Boolean(trpcErrorCode(archivedAttach.body)), "arquivada não liga").toBe(true);
      const reactivate = await trpcMutation(adminApi, "media.reactivate", { id: mediaId });
      expect(reactivate.status, trpcErrorMessage(reactivate.body) || "").toBeLessThan(400);

      const forbiddenId = trackMedia(ledger, await createMedia(adminApi, origin, `qa-acervo-forbidden-${ledger.runId}.jpg`, { publicationAllowed: false, approve: true }));
      const forbiddenAttach = await trpcMutation(adminApi, "editorial.attachMedia", {
        publicationId: created.id,
        mediaId: forbiddenId,
        publicationAllowed: true,
        storageKey: "hack",
        uploadId: "hack",
      });
      expect(forbiddenAttach.status >= 400 || Boolean(trpcErrorCode(forbiddenAttach.body)), "publicationAllowed false no servidor").toBe(true);
      const forbiddenRow = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, forbiddenId)).limit(1))[0];
      expect(forbiddenRow.publicationAllowed).toBe(false);

      const unapprovedId = trackMedia(ledger, await createMedia(adminApi, origin, `qa-acervo-unapproved-${ledger.runId}.jpg`, { publicationAllowed: true, approve: false }));
      const unapprovedAttach = await trpcMutation(adminApi, "editorial.attachMedia", { publicationId: created.id, mediaId: unapprovedId });
      expect(unapprovedAttach.status >= 400 || Boolean(trpcErrorCode(unapprovedAttach.body)), "não aprovada não liga").toBe(true);

      const alienPub = await trpcMutation(adminApi, "editorial.attachMedia", { publicationId: 2147483000, mediaId });
      expect(alienPub.status >= 400 || Boolean(trpcErrorCode(alienPub.body)), "publicationId inexistente").toBe(true);
      const alienMedia = await trpcMutation(adminApi, "editorial.attachMedia", { publicationId: created.id, mediaId: 2147483000 });
      expect(alienMedia.status >= 400 || Boolean(trpcErrorCode(alienMedia.body)), "mediaId inexistente").toBe(true);
      const alienProduction = await trpcMutation(adminApi, "productions.attachMedia", { productionId: 2147483000, mediaId });
      expect(alienProduction.status >= 400 || Boolean(trpcErrorCode(alienProduction.body)), "produção inexistente").toBe(true);

      await adminPage.goto("/admin/midias", { waitUntil: "domcontentloaded" });
      await adminPage.getByRole("button", { name: "Ligar a um conteúdo" }).first().click();
      await expect(adminPage.getByRole("heading", { name: "Ligar a um conteúdo" })).toBeVisible();
      await expect(adminPage.getByRole("button", { name: "Publicação editorial" })).toBeVisible();
      await expect(adminPage.getByRole("button", { name: "Produção da Rede" })).toBeVisible();
      await adminPage.getByRole("button", { name: "Cancelar" }).click();

      const extraAttach = await trpcMutation(adminApi, "editorial.attachMedia", {
        publicationId: created.id,
        mediaId,
        asCover: true,
        partnerId: 999999,
        territoryId: 999999,
        publicationAllowed: false,
        storageKey: "nao-deve-gravar",
        uploadId: "nao-deve-gravar",
      });
      expect(extraAttach.status, `${trpcErrorCode(extraAttach.body)} ${trpcErrorMessage(extraAttach.body)}`).toBeLessThan(400);
      const linkedPartner = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1))[0];
      expect(linkedPartner.partnerId ?? null).not.toBe(999999);
      expect(linkedPartner.storageKey).not.toBe("nao-deve-gravar");
      expect(linkedPartner.publicationAllowed).toBe(true);

      const usagesLinked = unwrapTrpcData((await trpcQuery(adminApi, "media.usages", { id: mediaId })).body) as Array<{ kind: string }>;
      expect(usagesLinked.some(item => item.kind === "publicationMedia")).toBe(true);

      await adminPage.goto("/admin/midias", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByText("Ligada a", { exact: false }).first()).toBeVisible();
      await expect(adminPage.locator("body")).not.toContainText("storageKey");
      await expect(adminPage.locator("body")).not.toContainText("uploadId");

      for (let index = 0; index < 4; index += 1) {
        const extraId = trackMedia(ledger, await createMedia(adminApi, origin, `qa-acervo-slot-${index}-${ledger.runId}.jpg`));
        const attached = await trpcMutation(adminApi, "editorial.attachMedia", { publicationId: created.id, mediaId: extraId });
        expect(attached.status, trpcErrorMessage(attached.body) || "").toBeLessThan(400);
      }
      const sixthId = trackMedia(ledger, await createMedia(adminApi, origin, `qa-acervo-sixth-${ledger.runId}.jpg`));
      const sixth = await trpcMutation(adminApi, "editorial.attachMedia", { publicationId: created.id, mediaId: sixthId });
      expect(sixth.status >= 400 || Boolean(trpcErrorCode(sixth.body)), "6ª fotografia DENY").toBe(true);

      const restoreId = trackMedia(ledger, await createMedia(adminApi, origin, `qa-acervo-restore-${ledger.runId}.jpg`));
      const toTrash = await trpcMutation(adminApi, "media.delete", { id: restoreId, note: "QA Acervo restore distinto de retirar de uso" });
      expect(toTrash.status, trpcErrorMessage(toTrash.body) || "").toBeLessThan(400);
      const restored = await trpcMutation(adminApi, "media.restore", { id: restoreId });
      expect(restored.status, trpcErrorMessage(restored.body) || "").toBeLessThan(400);
      const restoredRow = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, restoreId)).limit(1))[0];
      expect(restoredRow.deletedAt).toBeNull();
      expect(restoredRow.state).toBe("Arquivado");

      const preview = unwrapTrpcData((await trpcQuery(adminApi, "editorial.preview", { id: created.id })).body) as { version: number };
      const saveText = await trpcMutation(adminApi, "editorial.update", {
        id: created.id,
        expectedVersion: preview.version,
        body: `Texto documental do Acervo ${ledger.runId}.`,
      });
      expect(saveText.status, trpcErrorMessage(saveText.body) || "").toBeLessThan(400);
      const afterText = unwrapTrpcData((await trpcQuery(adminApi, "editorial.preview", { id: created.id })).body) as { version: number };
      const territories = unwrapTrpcData((await trpcQuery(adminApi, "editorial.taxonomies")).body) as Array<{ id: number; dimension: string }> | undefined;
      let territoryId = territories?.find(item => item.dimension === "Território")?.id;
      if (!territoryId) {
        const createdCity = await trpcMutation(adminApi, "editorial.createTaxonomy", {
          dimension: "Território",
          name: `QA cidade acervo ${ledger.runId}`,
          place: { uf: "AM", ibgeId: "outro", customName: `QA ACERVO ${ledger.runId}` },
        });
        expect(createdCity.status).toBeLessThan(400);
        territoryId = (unwrapTrpcData(createdCity.body) as { id: number }).id;
        ledger.add("taxonomy", territoryId);
      }
      const linkCity = await trpcMutation(adminApi, "editorial.update", { id: created.id, expectedVersion: afterText.version, taxonomyIds: [territoryId] });
      expect(linkCity.status, trpcErrorMessage(linkCity.body) || "").toBeLessThan(400);
      const afterCity = unwrapTrpcData((await trpcQuery(adminApi, "editorial.preview", { id: created.id })).body) as { version: number };
      const publish = await trpcMutation(adminApi, "editorial.publishDirect", { id: created.id, expectedVersion: afterCity.version });
      expect(publish.status, trpcErrorMessage(publish.body) || "").toBeLessThan(400);

      const blocked = await trpcMutation(adminApi, "media.archive", { id: mediaId });
      expect(blocked.status >= 400 || Boolean(trpcErrorCode(blocked.body))).toBe(true);
      expect(trpcErrorMessage(blocked.body)).toContain("conteúdo publicado");
      expect(MEDIA_IN_PUBLIC_USE_ARCHIVE_MESSAGE).toContain("conteúdo publicado");

      await visitorPage.goto("/acervo", { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByText("não é o Acervo interno")).toBeVisible();

      await db.insert(networkProductionMedia).values({
        productionId: 2147483646,
        mediaId: purgeMediaId,
        layer: "Editorial",
        displayOrder: 0,
        attachedBy: 1,
      });
      const trash = await trpcMutation(adminApi, "media.delete", { id: purgeMediaId, note: "QA Acervo purge com uso de produção" });
      expect(trash.status, trpcErrorMessage(trash.body) || "").toBeLessThan(400);
      const purgeDenied = await trpcMutation(adminApi, "media.purge", { id: purgeMediaId, confirmation: `qa-acervo-purge-${ledger.runId}.jpg` });
      expect(purgeDenied.status >= 400 || Boolean(trpcErrorCode(purgeDenied.body))).toBe(true);
      expect(trpcErrorMessage(purgeDenied.body) || "").toMatch(/networkProductionMedia|Produção da Rede/i);
      await db.delete(networkProductionMedia).where(eq(networkProductionMedia.mediaId, purgeMediaId));
      const filenameRow = (await db.select({ filename: mediaAssets.filename }).from(mediaAssets).where(eq(mediaAssets.id, purgeMediaId)).limit(1))[0];
      const purgeOk = await trpcMutation(adminApi, "media.purge", { id: purgeMediaId, confirmation: filenameRow?.filename || `mídia #${purgeMediaId}` });
      expect(purgeOk.status, trpcErrorMessage(purgeOk.body) || "").toBeLessThan(400);
    } finally {
      await visitor.close();
      await admin.close();
    }
  });
});
