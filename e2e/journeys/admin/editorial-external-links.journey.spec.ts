import { and, eq, like } from "drizzle-orm";
import type { APIRequestContext, Page } from "@playwright/test";
import { publicationMedia, publications, taxonomies } from "../../../drizzle/schema";
import { expect, test } from "../../fixtures/cleanup";
import { waitTrpcPost } from "../../lib/journeys/trpcWait";
import { registerOperationalCleanup } from "../../lib/operationalCleanup";
import { QA_JPEG_BYTES } from "../../lib/qaJpeg";
import { requireQaDb } from "../../lib/qaDb";
import { qaMutationReadiness } from "../../lib/qaReadiness";
import { assertQaMysqlTarget } from "../../lib/qaTarget";
import { hasPersonaState, personaStatePath } from "../../personas";
import {
  denied,
  trpcErrorCode,
  trpcErrorMessage,
  trpcMutation,
  trpcQuery,
  unwrapTrpcData,
} from "../../support";

const readiness = qaMutationReadiness();
const kinds = ["História", "Documentário", "Projeto", "Fotografia documental"] as const;
const fallback: Record<string, string> = {
  Cobertura: "Ver álbum completo",
  História: "Ver história completa",
  Documentário: "Ver documentário completo",
  Projeto: "Ver projeto completo",
  "Fotografia documental": "Ver produção completa",
};

test.use({ channel: "chrome" });

type Preview = {
  id: number;
  slug: string;
  version: number;
  status: string;
  isPublic: boolean;
  externalAlbumUrl: string | null;
  externalAlbumLabel: string | null;
  contentKind: string;
};

async function previewOf(request: APIRequestContext, id: number) {
  const { status, body } = await trpcQuery(request, "editorial.preview", { id });
  expect(status, trpcErrorMessage(body) || "").toBeLessThan(400);
  return unwrapTrpcData(body) as Preview;
}

async function createKind(adminPage: Page, kind: string, title: string) {
  await adminPage.goto(`/admin/publicacoes?novo=1&tipo=${encodeURIComponent(kind)}`, { waitUntil: "domcontentloaded" });
  await expect(adminPage.getByRole("heading", { name: "Criar e publicar." })).toBeVisible();
  await adminPage.getByRole("button", { name: kind, exact: true }).click();
  await adminPage.getByPlaceholder("Nome no portal").fill(title);
  const createWait = waitTrpcPost(adminPage, "editorial.create");
  await adminPage.getByRole("button", { name: "Começar" }).click();
  const created = unwrapTrpcData(await (await createWait).json()) as { id?: number; slug?: string };
  expect(created.id).toBeTruthy();
  await expect(adminPage).toHaveURL(new RegExp(`/admin/editar/${created.id}`));
  return created as { id: number; slug: string };
}

test.describe("Links externos editoriais — label, fallback, estados e segurança no QA", () => {
  test("circuito CMS → prévia → portal → cleanup", async ({ browser, ledger }) => {
    test.setTimeout(240_000);
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);
    expect(readiness.guard.allowed, readiness.guard.reason).toBe(true);
    expect(process.env.S3_BUCKET || "", "Tigris/S3 não pode estar no QA").toBe("");
    expect(hasPersonaState("superAdmin"), "ABORTADO: capture Super Admin QA.").toBe(true);

    registerOperationalCleanup(ledger);
    const skips: string[] = [];
    const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const admin = await browser.newContext({ storageState: personaStatePath("superAdmin") });

    try {
      const visitorPage = await visitor.newPage();
      const adminPage = await admin.newPage();
      const adminApi = admin.request;
      const db = await requireQaDb();
      const albumUrl = "https://example.com/album-oju";
      const videoUrl = "https://example.com/video-oju";

      await adminPage.goto("/admin/publicacoes?novo=1&tipo=Cobertura", { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByRole("heading", { name: "Criar e publicar." })).toBeVisible();
      const coberturaTitle = `QA-EXT Cobertura ${ledger.runId}`;
      await adminPage.getByRole("button", { name: "Cobertura", exact: true }).click();
      await adminPage.getByPlaceholder("Nome no portal").fill(coberturaTitle);
      const createWait = waitTrpcPost(adminPage, "editorial.create");
      await adminPage.getByRole("button", { name: "Começar" }).click();
      const createResponse = await createWait;
      expect(createResponse.status()).toBeLessThan(400);
      const created = unwrapTrpcData(await createResponse.json()) as { id?: number; slug?: string };
      expect(created.id).toBeTruthy();
      ledger.add("publication", created.id!);
      await expect(adminPage).toHaveURL(new RegExp(`/admin/editar/${created.id}`));
      await expect(adminPage.getByText("Rascunho")).toBeVisible();
      await expect(adminPage.locator("#link-externo")).toBeVisible();
      await expect(adminPage.locator("#link-externo").getByText("Produção completa", { exact: true })).toBeVisible();
      await expect(adminPage.getByLabel("Link externo", { exact: true })).toBeVisible();
      await expect(adminPage.getByRole("textbox", { name: "Texto do botão (opcional)" })).toBeVisible();

      await adminPage.locator("#texto textarea").fill(`Texto documental ${ledger.runId} com janela editorial limitada.`);
      await adminPage.getByLabel("Link externo", { exact: true }).fill(albumUrl);
      await adminPage.getByRole("textbox", { name: "Texto do botão (opcional)" }).fill("Acessar registro completo");
      const saveWait = waitTrpcPost(adminPage, "editorial.update");
      await adminPage.getByRole("button", { name: "Salvar", exact: true }).click();
      const saveResponse = await saveWait;
      const saveBody = await saveResponse.json();
      expect(saveResponse.status(), trpcErrorMessage(saveBody) || "").toBeLessThan(400);
      await expect(adminPage.getByText("Texto salvo.")).toBeVisible();

      const draftPublic = await trpcQuery(visitor.request, "editorial.bySlug", { slug: created.slug || (await previewOf(adminApi, created.id!)).slug });
      const draftPayload = unwrapTrpcData(draftPublic.body);
      expect(draftPayload, "rascunho não pode ir ao visitante").toBeNull();

      let current = await previewOf(adminApi, created.id!);
      await adminPage.goto(`/admin/preview/${created.id}`, { waitUntil: "domcontentloaded" });
      await expect(adminPage.getByText("Produção completa")).toBeVisible();
      await expect(adminPage.getByRole("link", { name: "Acessar registro completo →" })).toHaveAttribute("href", albumUrl);
      await expect(adminPage.getByRole("link", { name: "Acessar registro completo →" })).toHaveAttribute("target", "_blank");
      await expect(adminPage.getByRole("link", { name: "Acessar registro completo →" })).toHaveAttribute("rel", "noopener noreferrer");
      await expect(adminPage.locator("main, article").getByText(albumUrl, { exact: true })).toHaveCount(0);

      const visitorUpdate = await trpcMutation(visitor.request, "editorial.update", {
        id: created.id,
        expectedVersion: current.version,
        externalAlbumLabel: "não deve gravar",
      });
      expect(denied(visitorUpdate.status, visitorUpdate.body), "visitante não edita label").toBe(true);
      skips.push("SKIP — persona profissional/territorial ausente neste QA. RBAC de escopo coberto pelo DENY anônimo + canEditPublication unitário.");

      for (const badUrl of ["javascript:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc/passwd", "blob:https://example.com/x", "https://user:pass@example.com/x"]) {
        current = await previewOf(adminApi, created.id!);
        const bad = await trpcMutation(adminApi, "editorial.update", { id: created.id, expectedVersion: current.version, externalAlbumUrl: badUrl });
        expect(bad.status >= 400 || Boolean(trpcErrorCode(bad.body)), `URL ${badUrl} deveria ser recusada`).toBe(true);
      }
      for (const badLabel of ["<script>alert(1)</script>", 'onclick="alert(1)"', "[clique](https://example.com)", "https://example.com", "javascript:alert(1)", "<b>html</b>"]) {
        current = await previewOf(adminApi, created.id!);
        const bad = await trpcMutation(adminApi, "editorial.update", { id: created.id, expectedVersion: current.version, externalAlbumLabel: badLabel });
        expect(bad.status >= 400 || Boolean(trpcErrorCode(bad.body)), `label ${badLabel} deveria ser recusado`).toBe(true);
      }

      const territories = unwrapTrpcData((await trpcQuery(adminApi, "editorial.taxonomies")).body) as Array<{ id: number; dimension: string }> | undefined;
      let territoryId = territories?.find(item => item.dimension === "Território")?.id;
      if (!territoryId) {
        const createdCity = await trpcMutation(adminApi, "editorial.createTaxonomy", {
          dimension: "Território",
          name: `QA cidade ${ledger.runId}`,
          place: { uf: "AM", ibgeId: "outro", customName: `QA EXT ${ledger.runId}` },
        });
        expect(createdCity.status).toBeLessThan(400);
        territoryId = (unwrapTrpcData(createdCity.body) as { id: number }).id;
        ledger.add("taxonomy", territoryId);
      }
      current = await previewOf(adminApi, created.id!);
      const linkCity = await trpcMutation(adminApi, "editorial.update", {
        id: created.id,
        expectedVersion: current.version,
        taxonomyIds: [territoryId],
      });
      expect(linkCity.status, trpcErrorMessage(linkCity.body) || "").toBeLessThan(400);

      const origin = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";
      const upload = await adminApi.post("/api/media/upload", {
        headers: { origin, "content-type": "image/jpeg", "x-file-name": `qa-ext-${ledger.runId}.jpg` },
        data: QA_JPEG_BYTES,
      });
      expect(upload.status(), await upload.text()).toBeLessThan(400);
      const uploaded = (await upload.json()) as { url?: string; key?: string; filename?: string; uploadId?: string };
      const media = await trpcMutation(adminApi, "media.create", {
        mediaType: "foto",
        assetUrl: uploaded.url,
        storageKey: uploaded.key,
        filename: uploaded.filename || `qa-ext-${ledger.runId}.jpg`,
        origin: "Operação Ojú QA",
        credit: "Equipe Ojú",
        authorization: "Autoral própria",
        purpose: "Capa editorial QA",
        publicationAllowed: true,
        uploadId: uploaded.uploadId,
      });
      expect(media.status, `${trpcErrorCode(media.body)} ${trpcErrorMessage(media.body)}`).toBeLessThan(400);
      const mediaId = (unwrapTrpcData(media.body) as { id: number }).id;
      ledger.add("mediaAsset", mediaId);
      const approve = await trpcMutation(adminApi, "media.approveUpload", { id: mediaId });
      expect(approve.status, trpcErrorMessage(approve.body) || "").toBeLessThan(400);
      const attach = await trpcMutation(adminApi, "editorial.attachMedia", { publicationId: created.id, mediaId, asCover: true });
      expect(attach.status, trpcErrorMessage(attach.body) || "").toBeLessThan(400);
      const linkedBeforePublish = await db.select().from(publicationMedia).where(eq(publicationMedia.publicationId, created.id!));
      expect(linkedBeforePublish.length, "link externo não conta como mídia").toBe(1);

      current = await previewOf(adminApi, created.id!);
      const featuredBefore = unwrapTrpcData((await trpcQuery(visitor.request, "editorial.featured", {})).body) as unknown[];
      const publish = await trpcMutation(adminApi, "editorial.publishDirect", { id: created.id, expectedVersion: current.version });
      expect(publish.status, trpcErrorMessage(publish.body) || "").toBeLessThan(400);

      const publishedRow = (await db.select().from(publications).where(eq(publications.id, created.id!)).limit(1))[0];
      expect(publishedRow.status).toBe("Publicada");
      expect(publishedRow.isPublic).toBe(true);

      await visitorPage.goto(`/historias/${publishedRow.slug}`, { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByRole("heading", { name: coberturaTitle })).toBeVisible();
      const cta = visitorPage.getByRole("link", { name: "Acessar registro completo →" });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", albumUrl);
      await expect(cta).toHaveAttribute("target", "_blank");
      await expect(cta).toHaveAttribute("rel", "noopener noreferrer");
      await expect(visitorPage.getByText(albumUrl, { exact: true })).toHaveCount(0);
      await expect(visitorPage.locator("iframe")).toHaveCount(0);
      await expect(visitorPage.locator(`video[src="${albumUrl}"]`)).toHaveCount(0);
      const popupPromise = visitorPage.waitForEvent("popup");
      await cta.click();
      const popup = await popupPromise;
      expect(popup.url()).toContain("example.com/album-oju");
      await popup.close();

      await visitorPage.goto("/", { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByRole("link", { name: "Acessar registro completo →" })).toHaveCount(0);
      await expect(visitorPage.getByText(albumUrl)).toHaveCount(0);
      const featuredAfter = unwrapTrpcData((await trpcQuery(visitor.request, "editorial.featured", {})).body) as unknown[];
      expect(featuredAfter.length, "publicar com link não compra Home").toBe(featuredBefore.length);

      current = await previewOf(adminApi, created.id!);
      const clearLabel = await trpcMutation(adminApi, "editorial.update", {
        id: created.id,
        expectedVersion: current.version,
        externalAlbumLabel: "",
      });
      expect(clearLabel.status).toBeLessThan(400);
      await visitorPage.goto(`/historias/${publishedRow.slug}`, { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByRole("link", { name: "Ver álbum completo →" })).toBeVisible();

      current = await previewOf(adminApi, created.id!);
      const relabel = await trpcMutation(adminApi, "editorial.update", {
        id: created.id,
        expectedVersion: current.version,
        externalAlbumLabel: "Acessar cobertura completa",
      });
      expect(relabel.status).toBeLessThan(400);
      await visitorPage.goto(`/historias/${publishedRow.slug}`, { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByRole("link", { name: "Acessar cobertura completa →" })).toBeVisible();

      current = await previewOf(adminApi, created.id!);
      const addVideo = await trpcMutation(adminApi, "editorial.update", {
        id: created.id,
        expectedVersion: current.version,
        externalVideoUrl: videoUrl,
        externalVideoLabel: "Assistir versão completa",
      });
      expect(addVideo.status).toBeLessThan(400);
      await visitorPage.goto(`/historias/${publishedRow.slug}`, { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByRole("link", { name: "Assistir versão completa →" })).toHaveAttribute("href", videoUrl);
      await expect(visitorPage.locator(`video[src="${videoUrl}"]`)).toHaveCount(0);
      await expect(visitorPage.locator("iframe")).toHaveCount(0);

      current = await previewOf(adminApi, created.id!);
      const clearUrl = await trpcMutation(adminApi, "editorial.update", {
        id: created.id,
        expectedVersion: current.version,
        externalAlbumUrl: null,
        externalVideoUrl: null,
      });
      expect(clearUrl.status).toBeLessThan(400);
      await visitorPage.goto(`/historias/${publishedRow.slug}`, { waitUntil: "domcontentloaded" });
      await expect(visitorPage.getByText("Produção completa")).toHaveCount(0);
      await expect(visitorPage.getByRole("link", { name: /completo →/ })).toHaveCount(0);

      current = await previewOf(adminApi, created.id!);
      await trpcMutation(adminApi, "editorial.update", {
        id: created.id,
        expectedVersion: current.version,
        externalAlbumUrl: albumUrl,
        externalAlbumLabel: "Acessar registro completo",
      });
      current = await previewOf(adminApi, created.id!);
      await db.update(publications).set({ quarantinedAt: new Date() }).where(eq(publications.id, created.id!));
      expect(unwrapTrpcData((await trpcQuery(visitor.request, "editorial.bySlug", { slug: publishedRow.slug })).body)).toBeNull();
      await db.update(publications).set({ quarantinedAt: null, quarantinedBy: null, quarantineCaseId: null }).where(eq(publications.id, created.id!));

      current = await previewOf(adminApi, created.id!);
      const unpublish = await trpcMutation(adminApi, "editorial.unpublish", { id: created.id, expectedVersion: current.version });
      expect(unpublish.status).toBeLessThan(400);
      expect(unwrapTrpcData((await trpcQuery(visitor.request, "editorial.bySlug", { slug: publishedRow.slug })).body)).toBeNull();
      current = await previewOf(adminApi, created.id!);
      const republish = await trpcMutation(adminApi, "editorial.republish", { id: created.id, expectedVersion: current.version });
      expect(republish.status, trpcErrorMessage(republish.body) || "").toBeLessThan(400);

      current = await previewOf(adminApi, created.id!);
      const trash = await trpcMutation(adminApi, "editorial.delete", {
        id: created.id,
        expectedVersion: current.version,
        note: "QA AUTO lixeira do circuito de link externo.",
      });
      expect(trash.status, trpcErrorMessage(trash.body) || "").toBeLessThan(400);
      expect(unwrapTrpcData((await trpcQuery(visitor.request, "editorial.bySlug", { slug: publishedRow.slug })).body)).toBeNull();
      current = await previewOf(adminApi, created.id!);
      const restore = await trpcMutation(adminApi, "editorial.restore", { id: created.id, expectedVersion: current.version, note: "QA AUTO restaura para teardown." });
      expect(restore.status, trpcErrorMessage(restore.body) || "").toBeLessThan(400);

      skips.push("SKIP — cobertura comercial sem autorização: exigiria commercialRequest e não pertence a esta missão.");

      for (const kind of kinds) {
        const title = `QA-EXT ${kind} ${ledger.runId}`;
        const made = await createKind(adminPage, kind, title);
        ledger.add("publication", made.id);
        await expect(adminPage.locator("#link-externo")).toBeVisible();
        await expect(adminPage.getByLabel("Link externo", { exact: true })).toBeVisible();
        await expect(adminPage.getByRole("textbox", { name: "Texto do botão (opcional)" })).toBeVisible();
        await adminPage.getByLabel("Link externo", { exact: true }).fill(`https://example.com/${encodeURIComponent(kind)}`);
        await adminPage.getByRole("textbox", { name: "Texto do botão (opcional)" }).fill(`Acessar ${kind.toLowerCase()}`);
        const kindSave = waitTrpcPost(adminPage, "editorial.update");
        await adminPage.getByRole("button", { name: "Salvar", exact: true }).click();
        expect((await kindSave).status()).toBeLessThan(400);
        await adminPage.goto(`/admin/preview/${made.id}`, { waitUntil: "domcontentloaded" });
        await expect(adminPage.getByRole("link", { name: `Acessar ${kind.toLowerCase()} →` })).toBeVisible();
        current = await previewOf(adminApi, made.id);
        const fallbackSave = await trpcMutation(adminApi, "editorial.update", {
          id: made.id,
          expectedVersion: current.version,
          externalAlbumLabel: "   ",
        });
        expect(fallbackSave.status).toBeLessThan(400);
        await adminPage.goto(`/admin/preview/${made.id}`, { waitUntil: "domcontentloaded" });
        await expect(adminPage.getByRole("link", { name: `${fallback[kind]} →` })).toBeVisible();
        expect(unwrapTrpcData((await trpcQuery(visitor.request, "editorial.bySlug", { slug: made.slug })).body)).toBeNull();
      }

      await test.info().attach("qa-ext-skips", { body: skips.join("\n"), contentType: "text/plain" });
    } finally {
      await visitor.close();
      await admin.close();
    }
  });

  test("nenhum ghost QA-EXT permanece após o teardown", async () => {
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);
    const db = await requireQaDb();
    const leftoverPubs = await db.select({ id: publications.id, title: publications.title }).from(publications).where(like(publications.title, "QA-EXT %"));
    expect(leftoverPubs, leftoverPubs.map(item => `${item.id}:${item.title}`).join(", ")).toEqual([]);
    const leftoverCities = await db.select({ id: taxonomies.id, name: taxonomies.name }).from(taxonomies).where(and(eq(taxonomies.dimension, "Território"), like(taxonomies.name, "QA EXT %")));
    expect(leftoverCities, leftoverCities.map(item => `${item.id}:${item.name}`).join(", ")).toEqual([]);
  });
});
