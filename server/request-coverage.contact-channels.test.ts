import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("canais de orçamento", () => {
  it("mantém WhatsApp e Instagram oficiais, sem campo de e-mail ou retorno genérico", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/RequestCoverage.tsx"), "utf8");
    const channels = readFileSync(resolve(process.cwd(), "client/src/lib/publicNav.ts"), "utf8");
    expect(channels).toContain("https://wa.me/5592920019527");
    expect(channels).toContain("https://instagram.com/oju.fotografia");
    expect(channels).toContain("@oju.fotografia");
    expect(source).toContain("OJU_WHATSAPP_LABEL");
    expect(source).toContain("OJU_INSTAGRAM_HANDLE");
    expect(source).not.toContain('type="email"');
    expect(source).not.toContain("Telefone, e-mail ou outra forma de contato");
  });
});
