import { expect, test } from "@playwright/test";
import { assertQaMysqlTarget } from "../../lib/qaTarget";
import { denied, trpcErrorCode, trpcMutation, trpcQuery } from "../../support";

test.describe("Jornada segurança — visitante vs Admin e mutations", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("URLs admin diretas caem na parede de login", async ({ page }) => {
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);
    for (const path of ["/admin", "/admin/candidaturas", "/admin/colaboradores", "/admin/politicas-comerciais", "/admin/oportunidades"] as const) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Centro Administrativo Ojú" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
    }
  });

  test("mutations administrativas recusam anônimo", async ({ request }) => {
    const probes: Array<{ procedure: string; input: unknown }> = [
      { procedure: "joinRequests.review", input: { id: 1, status: "Aprovada" } },
      { procedure: "collaborators.list", input: undefined },
      { procedure: "editorial.create", input: { title: "QA não deve criar", contentKind: "História" } },
      { procedure: "opportunities.create", input: { title: "QA", briefing: "xxxxxxxxxx", workType: "Fotografia", territoryId: 1, totalValue: 10, specialtyIds: ["fotografo"] } },
    ];
    for (const probe of probes) {
      const result =
        probe.procedure === "collaborators.list"
          ? await trpcQuery(request, probe.procedure)
          : await trpcMutation(request, probe.procedure, probe.input);
      expect(denied(result.status, result.body), `${probe.procedure} ${trpcErrorCode(result.body) || result.status}`).toBe(true);
    }
  });

  test("ID inventado de candidatura não vaza para anônimo", async ({ request }) => {
    const { status, body } = await trpcQuery(request, "joinRequests.list");
    expect(denied(status, body)).toBe(true);
  });
});
