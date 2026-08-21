import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("regras de segurança de execução", () => {
  const server = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");
  const access = readFileSync(resolve(process.cwd(), "server/_core/trpc.ts"), "utf8");

  it("envia cabeçalhos defensivos e remove a identificação do framework", () => {
    expect(server).toContain('app.disable("x-powered-by")');
    expect(server).toContain('"X-Content-Type-Options", "nosniff"');
    expect(server).toContain('"X-Frame-Options", "DENY"');
    expect(server).toContain('"Referrer-Policy", "strict-origin-when-cross-origin"');
  });

  it("protege o upload por autenticação, papel permitido, tipo e limite de tamanho", () => {
    expect(server).toContain('limit: "16mb"');
    expect(server).toContain('"Seu perfil não possui permissão para enviar mídia."');
    expect(server).toContain('"Tipo de arquivo não permitido."');
  });

  it("mantém as rotas administrativas atrás dos papéis administrativos", () => {
    expect(access).toContain("['administrador', 'administrador principal']");
    expect(access).toContain('code: "FORBIDDEN"');
  });
});
