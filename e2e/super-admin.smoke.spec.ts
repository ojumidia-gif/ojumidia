import { expect, test } from "@playwright/test";
import { hasPersonaState, personaStatePath } from "./personas";
import { assertQaMysqlTarget } from "./lib/qaTarget";
import { readAuthMe, trpcErrorCode, trpcQuery } from "./support";

const skip = !hasPersonaState("superAdmin");

test.describe("Super Admin QA — sessão real, somente leitura", () => {
  test.use({ storageState: skip ? { cookies: [], origins: [] } : personaStatePath("superAdmin") });

  test("ambiente da suíte é o MySQL Docker QA", () => {
    const check = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(check.ok, check.ok ? "" : check.reason).toBe(true);
  });

  test("auth.me reconhece administrador principal", async ({ request }) => {
    test.skip(skip, "BLOCKED: e2e/.auth/super-admin.json ausente. Capture OAuth real contra o QA.");
    const { user, status } = await readAuthMe(request);
    expect(status).toBe(200);
    expect(user?.role).toBe("administrador principal");
    expect(user!.adminAccess).toBeTruthy();
  });

  test("/admin abre o painel nacional", async ({ page }) => {
    test.skip(skip, "BLOCKED: e2e/.auth/super-admin.json ausente.");
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Painel nacional")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  });

  test("endpoints administrativos de leitura reconhecem a sessão", async ({ request }) => {
    test.skip(skip, "BLOCKED: e2e/.auth/super-admin.json ausente.");
    for (const procedure of ["operations.overview", "partners.myContext", "collaborators.list"] as const) {
      const { status, body } = await trpcQuery(request, procedure, procedure === "operations.overview" ? { limit: 10 } : undefined);
      expect(status, procedure).toBeLessThan(500);
      expect(trpcErrorCode(body), procedure).toBeUndefined();
    }
  });
});
