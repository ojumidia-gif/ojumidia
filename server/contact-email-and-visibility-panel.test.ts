import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("contato institucional e monitoramento de vigências", () => {
  it("mantém o e-mail público da Ojú separado do acesso administrativo", () => {
    const contact = source("client/src/pages/Contact.tsx");
    expect(contact).toContain('const CONTACT_EMAIL = "ojumidia@gmail.com"');
    expect(contact).toContain("mailto:${CONTACT_EMAIL}");
    expect(contact).toContain("dúvida, sugestão, solicitação ou proposta de parceria");
    expect(contact).toContain("Preparar e-mail para a Ojú");
    expect(contact).toContain("contact-email-form");
    expect(contact).toContain("window.location.href");
  });

  it("mostra uma distribuição real de receita e controles de vencimento", () => {
    const panel = source("client/src/pages/admin/InstitutionVisibilityAdmin.tsx");
    expect(panel).toContain("Distribuição das receitas ativas");
    expect(panel).toContain("distributionTotal > 0");
    expect(panel).toContain("vence7");
    expect(panel).toContain("Renovação próxima");
    expect(panel).toContain("Nenhum valor é simulado.");
  });
});
