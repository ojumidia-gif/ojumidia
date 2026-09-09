import { expect, test } from "@playwright/test";
import {
  assertReadOnlyWatch,
  findPublicProfessionalSlug,
  findPublicTerritorySlug,
  isInternalOjuHref,
  openPublicPath,
  waitUntilSettled,
} from "./support";

test.describe("Navegação real", () => {
  test("Home → Rede → Profissionais → perfil público (se existir)", async ({ page, request }) => {
    const watch = await openPublicPath(page, "/");
    await expect(page.getByRole("link", { name: "Conheça a Rede" })).toBeVisible();
    await page.getByRole("link", { name: "Conheça a Rede" }).click();
    await expect(page).toHaveURL(/\/rede$/);
    await expect(page.getByRole("heading", { name: "Conheça a Rede Ojú." })).toBeVisible();
    await waitUntilSettled(page, ["Organizando a Rede…"]);

    await page.goto("/rede/profissionais", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Conheça a Rede Ojú." })).toBeVisible();
    await waitUntilSettled(page, ["Organizando a Rede…"]);

    const slug = await findPublicProfessionalSlug(request);
    if (!slug) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "Fluxo de perfil omitido: não há profissional público real.",
      });
      await assertReadOnlyWatch(watch);
      return;
    }

    await page.locator(`main a[href='/rede/profissionais/${slug}']`).first().click();
    await expect(page).toHaveURL(new RegExp(`/rede/profissionais/${slug}`));
    await waitUntilSettled(page, ["Carregando presença na Rede…"]);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await assertReadOnlyWatch(watch);
  });

  test("Home → Territórios → território (se existir)", async ({ page, request }) => {
    const watch = await openPublicPath(page, "/");
    await page.getByRole("button", { name: "Chão" }).hover();
    await page.getByRole("link", { name: "Cidades", exact: true }).click();
    await expect(page).toHaveURL(/\/territorios$/);
    await waitUntilSettled(page, ["Organizando cidades autorizadas…"]);

    const slug = await findPublicTerritorySlug(request);
    if (!slug) {
      await expect(page.getByRole("heading", { name: "Ainda não há cidades públicas organizadas." })).toBeVisible();
      await assertReadOnlyWatch(watch);
      return;
    }

    await page.locator(`main a[href='/territorios/${slug}']`).first().click();
    await expect(page).toHaveURL(new RegExp(`/territorios/${slug}`));
    await waitUntilSettled(page, ["Carregando cidade..."]);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Este caminho não existe no acervo.")).toHaveCount(0);
    await assertReadOnlyWatch(watch);
  });

  test("Home → Busca pelo atalho do cabeçalho", async ({ page }) => {
    const watch = await openPublicPath(page, "/");
    await page.getByLabel("Buscar no acervo").click();
    await expect(page).toHaveURL(/\/busca$/);
    await expect(page.getByRole("heading", { name: "Busca no chão e no acervo" })).toBeVisible();
    await assertReadOnlyWatch(watch);
  });
});

test.describe("Links internos das páginas P0", () => {
  test("links internos da Home, Rede, Territórios e Busca não levam a 404/5xx", async ({ page, request }) => {
    const paths = ["/", "/rede", "/territorios", "/busca"];
    const seen = new Set<string>();

    for (const path of paths) {
      const watch = await openPublicPath(page, path);
      const origin = new URL(page.url()).origin;
      await waitUntilSettled(page, [
        "Organizando a Rede…",
        "Organizando cidades autorizadas…",
        "Buscando no acervo...",
      ]);
      const hrefs = await page.locator("header a[href], main a[href]").evaluateAll(anchors =>
        anchors.map(anchor => (anchor as HTMLAnchorElement).getAttribute("href") || ""),
      );
      for (const href of hrefs) {
        if (!isInternalOjuHref(href, origin)) continue;
        let absolute: string;
        try {
          absolute = new URL(href, origin).toString();
        } catch {
          continue;
        }
        if (seen.has(absolute)) continue;
        seen.add(absolute);
        const response = await request.get(absolute);
        expect(response.status(), `HTTP ${response.status()} em ${absolute}`).toBeLessThan(400);
      }
      await assertReadOnlyWatch(watch);
    }

    const sample = [...seen].slice(0, 12);
    for (const url of sample) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Este caminho não existe no acervo." })).toHaveCount(0);
      await expect(page.getByText("An unexpected error occurred.")).toHaveCount(0);
    }
  });
});

test.describe("Formulários públicos — só leitura/validação local", () => {
  test("Contrate cobertura abre campos e não envia", async ({ page }) => {
    const watch = await openPublicPath(page, "/contrate-sua-cobertura");
    await expect(page.getByRole("heading", { name: "Solicite uma cobertura." })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Nome ou organização" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar solicitação" })).toBeDisabled();
    await assertReadOnlyWatch(watch);
  });

  test("Ser parceiro abre campos e validação local sem persistir", async ({ page }) => {
    const watch = await openPublicPath(page, "/ser-parceiro");
    await expect(page.getByRole("heading", { name: "Entrar na Rede, na sua cidade." })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Nome" })).toBeVisible();
    await page.getByRole("button", { name: "Enviar pedido" }).click();
    await expect(page.getByRole("heading", { name: "Pedido recebido." })).toHaveCount(0);
    await assertReadOnlyWatch(watch);
  });

  test("Originar demanda anônimo pede login e não envia", async ({ page }) => {
    const watch = await openPublicPath(page, "/rede/originar");
    await expect(page.getByRole("heading", { name: "Originar uma demanda" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar para análise da Rede" })).toHaveCount(0);
    await assertReadOnlyWatch(watch);
  });
});
