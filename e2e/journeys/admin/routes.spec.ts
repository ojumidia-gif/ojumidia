import { expect, test } from "@playwright/test";
import { hasPersonaState, personaStatePath } from "../../personas";
import { assertQaMysqlTarget } from "../../lib/qaTarget";
import { ADMIN_STATIC_PATHS, WRITE_ON_READ_ADMIN_PATHS } from "../../lib/journeys/routes";

const skip = !hasPersonaState("superAdmin");

test.describe("Jornada Super Admin — mapa das rotas administrativas", () => {
  test.use({ storageState: skip ? { cookies: [], origins: [] } : personaStatePath("superAdmin") });

  test("abre cada rota admin estática autenticado, sem parede de login nem 5xx", async ({ page }) => {
    test.skip(skip, "BLOCKED: e2e/.auth/super-admin.json ausente.");
    test.setTimeout(240_000);
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Painel nacional")).toBeVisible();

    const broken: string[] = [];
    for (const path of ADMIN_STATIC_PATHS) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      const status = response?.status() ?? 0;
      const wall = await page.getByRole("heading", { name: "Centro Administrativo Ojú" }).count();
      const crash = await page.getByText("An unexpected error occurred.").count();
      if (status >= 500 || crash > 0 || wall > 0) {
        broken.push(`${path} HTTP ${status} wall=${wall} crash=${crash}`);
      }
      if ((WRITE_ON_READ_ADMIN_PATHS as readonly string[]).includes(path)) {
        test.info().annotations.push({
          type: "write-on-read",
          description: `${path} pode expirar Opportunity/visibilidade. QA vazio: efeito deve ser nulo.`,
        });
      }
    }
    expect(broken, broken.join("\n")).toEqual([]);
  });
});
