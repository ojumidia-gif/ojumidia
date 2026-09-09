import { expect, test } from "@playwright/test";
import { assertQaMysqlTarget } from "../../lib/qaTarget";

test.describe("Jornada visitante — formulário Ser parceiro", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("obrigatórios: envio sem cidade/especialidade/consentimento não persiste", async ({ page }) => {
    const qa = assertQaMysqlTarget(process.env.DATABASE_URL);
    expect(qa.ok, qa.ok ? "" : qa.reason).toBe(true);
    await page.goto("/ser-parceiro", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Nome").fill("QA AUTO incompleto");
    await page.getByLabel("E-mail para resposta").fill("qa-form@example.com");
    await page.getByLabel("WhatsApp").fill("92988001122");
    await page.getByLabel("Por que a Ojú e o que você já documenta").fill("Mensagem longa o bastante para o minLength.");
    await page.getByRole("button", { name: /Enviar pedido/ }).click();
    await expect(page.getByRole("heading", { name: "Pedido recebido." })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Entrar na Rede, na sua cidade." })).toBeVisible();
  });

  test("e-mail inválido: HTML recusa antes da API", async ({ page }) => {
    await page.goto("/ser-parceiro", { waitUntil: "domcontentloaded" });
    await page.getByLabel("E-mail para resposta").fill("nao-e-email");
    const valid = await page.getByLabel("E-mail para resposta").evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(valid).toBe(false);
  });
});
