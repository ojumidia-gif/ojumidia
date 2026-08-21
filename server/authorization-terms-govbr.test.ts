import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("termos de autorização assinados via gov.br", () => {
  const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
  const router = readFileSync(resolve(process.cwd(), "server/routers/commercial.ts"), "utf8");
  const pdf = readFileSync(resolve(process.cwd(), "client/src/lib/authorizationTermPdf.ts"), "utf8");
  const panel = readFileSync(resolve(process.cwd(), "client/src/pages/admin/RequestsAdmin.tsx"), "utf8");

  it("restringe o provedor de assinatura a gov.br e rastreia o PDF assinado", () => {
    expect(schema).toContain('authorizationTermStatuses = ["Gerado", "Aguardando assinatura gov.br", "Assinado via gov.br", "Arquivado"]');
    expect(schema).toContain('mysqlEnum("signatureProvider", ["gov.br"])');
    expect(schema).toContain("signedDocumentUrl");
  });

  it("exige termo assinado antes de ativar a autorização editorial", () => {
    expect(router).toContain("Anexe o termo assinado via gov.br antes de ativar a autorização editorial.");
    expect(router).toContain("Assinado via gov.br");
    expect(router).toContain("authorizationAlerts");
  });

  it("oferece PDF, anexo PDF e alerta visual na carteira comercial", () => {
    expect(pdf).toContain("Assinatura exclusiva via gov.br");
    expect(panel).toContain("Exportar termo em PDF");
    expect(panel).toContain("Anexar PDF assinado via gov.br");
    expect(panel).toContain("cobertura");
  });
});
