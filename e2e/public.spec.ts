import { expect, test } from "@playwright/test";
import {
  assertReadOnlyWatch,
  findPublicProfessionalSlug,
  openPublicPath,
  waitUntilSettled,
} from "./support";

test.describe("Páginas públicas P0", () => {
  test("Home carrega e renderiza estrutura principal", async ({ page }) => {
    const watch = await openPublicPath(page, "/");
    await expect(page.getByRole("link", { name: /Ojú Mídia/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Este caminho não existe/);
    await expect(page.getByLabel("Buscar no acervo")).toBeVisible();
    await assertReadOnlyWatch(watch);
  });

  test("Rede carrega e sai do estado de loading", async ({ page }) => {
    const watch = await openPublicPath(page, "/rede");
    await expect(page.getByRole("heading", { name: "Conheça a Rede Ojú." })).toBeVisible();
    await waitUntilSettled(page, ["Organizando a Rede…"]);
    await expect(page.getByPlaceholder("Nome, especialidade ou território")).toBeVisible();
    await expect(page.getByRole("link", { name: "Contrate uma cobertura" })).toBeVisible();
    await assertReadOnlyWatch(watch);
  });

  test("Profissionais (lista da Rede) carrega", async ({ page }) => {
    const watch = await openPublicPath(page, "/rede/profissionais");
    await expect(page.getByRole("heading", { name: "Conheça a Rede Ojú." })).toBeVisible();
    await waitUntilSettled(page, ["Organizando a Rede…"]);
    await page.locator("select").first().selectOption("profissional");
    await waitUntilSettled(page, ["Organizando a Rede…"]);
    const empty = page.getByText("Ainda não há presença pública autorizada com esses filtros.");
    const cards = page.locator("main a[href*='/rede/profissionais/']");
    await expect(empty.or(cards.first())).toBeVisible();
    await assertReadOnlyWatch(watch);
  });

  test("Territórios carrega e sai do estado de loading", async ({ page }) => {
    const watch = await openPublicPath(page, "/territorios");
    await expect(page.getByRole("heading", { name: /Cidades que organizam memória/ })).toBeVisible();
    await waitUntilSettled(page, ["Organizando cidades autorizadas…"]);
    const empty = page.getByRole("heading", { name: "Ainda não há cidades públicas organizadas." });
    const cities = page.getByRole("heading", { name: "Cidades registradas" });
    await expect(empty.or(cities)).toBeVisible();
    await assertReadOnlyWatch(watch);
  });

  test("Busca carrega filtros e não fica presa em loading", async ({ page }) => {
    const watch = await openPublicPath(page, "/busca");
    await expect(page.getByRole("heading", { name: "Busca no chão e no acervo" })).toBeVisible();
    await waitUntilSettled(page, ["Buscando no acervo..."]);
    await expect(page.getByPlaceholder("Casa, cidade, nome autorizado…")).toBeVisible();
    await expect(page.getByRole("button", { name: "Buscar" })).toBeVisible();
    const empty = page.getByText("Nenhum conteúdo publicado corresponde aos filtros escolhidos.");
    const results = page.locator("main a[href^='/historias/']");
    await expect(empty.or(results.first())).toBeVisible();
    await assertReadOnlyWatch(watch);
  });

  test("Histórias editoriais carregam (lista ou vazio autorizado)", async ({ page }) => {
    const watch = await openPublicPath(page, "/historias");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await assertReadOnlyWatch(watch);
  });

  test("Comunidade, agenda e memórias carregam sem autenticação", async ({ page }) => {
    const hub = await openPublicPath(page, "/comunidade");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await assertReadOnlyWatch(hub);

    const agenda = await openPublicPath(page, "/agenda");
    await expect(page.getByRole("heading", { name: "Encontros que podem ser compartilhados com cuidado." })).toBeVisible();
    await assertReadOnlyWatch(agenda);

    const memories = await openPublicPath(page, "/memorias");
    await expect(page.getByRole("heading", { name: "Encontre vozes, temas e cidades que permanecem." })).toBeVisible();
    await assertReadOnlyWatch(memories);
  });

  test("Perfil público de profissional existente", async ({ page, request }) => {
    const slug = await findPublicProfessionalSlug(request);
    test.skip(
      !slug,
      "Nenhum profissional público autorizado foi encontrado na Rede. Não foi criado registro fictício.",
    );
    const watch = await openPublicPath(page, `/rede/profissionais/${slug}`);
    await waitUntilSettled(page, ["Carregando presença na Rede…"]);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Esta presença não está pública.");
    await expect(page.getByRole("link", { name: "Solicitar serviço" })).toBeVisible();
    await assertReadOnlyWatch(watch);
  });
});
