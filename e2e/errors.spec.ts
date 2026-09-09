import { expect, test } from "@playwright/test";
import { attachReadOnlyGuards, assertReadOnlyWatch, trpcErrorCode, trpcQuery } from "./support";

test.describe("Proteção anônima", () => {
  test("/admin anônimo não mostra o dashboard", async ({ page }) => {
    const watch = attachReadOnlyGuards(page);
    const response = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 500).toBeLessThan(400);

    await expect(page.getByRole("heading", { name: "Centro Administrativo Ojú" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar com Google" }).or(page.getByText("Não há login administrativo neste ambiente"))).toBeVisible();

    await expect(page.getByText("Alimente a cidade. Não redesenhe o site.")).toHaveCount(0);
    await expect(page.getByText("A Equipe Ojú muda o site")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Escrever" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sair" })).toHaveCount(0);
    await expect(page.getByText("Salvar @")).toHaveCount(0);
    await expect(page).not.toHaveURL(/acesso-local/);

    await assertReadOnlyWatch(watch);
  });

  test("/admin/publicacoes anônimo também fica na parede de autenticação", async ({ page }) => {
    const watch = attachReadOnlyGuards(page);
    await page.goto("/admin/publicacoes", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Centro Administrativo Ojú" })).toBeVisible();
    await expect(page.getByText("Publicações")).toHaveCount(0);
    await assertReadOnlyWatch(watch);
  });

  test("APIs protegidas de leitura recusam anônimo", async ({ request }) => {
    const procedures = ["productions.list", "opportunities.list", "networkDirectory.adminProfiles", "portalContent.adminList", "operations.auditLog"];
    for (const procedure of procedures) {
      const { status, body } = await trpcQuery(
        request,
        procedure,
        undefined,
        procedure === "opportunities.list" ? { intent: "auth-probe" } : undefined,
      );
      expect(status, `${procedure} HTTP ${status}`).toBeLessThan(500);
      const code = trpcErrorCode(body);
      const unauthorized = status === 401 || code === "UNAUTHORIZED";
      expect(unauthorized, `${procedure} deveria recusar anônimo; HTTP ${status} code=${code}`).toBeTruthy();
    }
  });
});

test.describe("Erros de runtime e rotas inexistentes", () => {
  test("rota inexistente mostra 404 de acervo, sem pageerror", async ({ page }) => {
    const watch = attachReadOnlyGuards(page);
    const response = await page.goto("/esta-rota-nao-existe-e2e-01", { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 500).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Este caminho não existe no acervo." })).toBeVisible();
    await assertReadOnlyWatch(watch);
  });

  test("Home não dispara mutações persistentes ao carregar", async ({ page }) => {
    const watch = attachReadOnlyGuards(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { level: 1 }).waitFor();
    await assertReadOnlyWatch(watch);
  });
});
