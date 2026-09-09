import { expect, test } from "@playwright/test";
import { assertQaMysqlTarget } from "../../lib/qaTarget";
import { PUBLIC_STATIC_PATHS, WRITE_ON_READ_PUBLIC_PATHS } from "../../lib/journeys/routes";

test.describe("Jornada visitante — mapa real do site público", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("abre cada rota pública estática e renderiza sem 5xx nem crash visível", async ({ page }) => {
    test.setTimeout(180_000);
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);

    const broken: string[] = [];
    for (const path of PUBLIC_STATIC_PATHS) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      const status = response?.status() ?? 0;
      const crash = await page.getByText("An unexpected error occurred.").count();
      const heading = await page.getByRole("heading", { level: 1 }).count();
      if (status >= 500 || crash > 0 || heading === 0) {
        broken.push(`${path} HTTP ${status} crash=${crash} h1=${heading}`);
      }
      if ((WRITE_ON_READ_PUBLIC_PATHS as readonly string[]).includes(path)) {
        test.info().annotations.push({
          type: "write-on-read",
          description: `${path} pode disparar community.publicDirectory / visibilidades. Não é GET inocente.`,
        });
      }
    }
    expect(broken, broken.join("\n")).toEqual([]);
  });

  test("Home → Chamar a Ojú → Ser parceiro (navegação humana)", async ({ page }) => {
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Chamar a Ojú" }).hover();
    await page.locator("header").getByRole("link", { name: "Ser parceiro" }).click();
    await expect(page).toHaveURL(/\/ser-parceiro$/);
    await expect(page.getByRole("heading", { name: "Entrar na Rede, na sua cidade." })).toBeVisible();
  });
});
