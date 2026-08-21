import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("acesso administrativo local de desenvolvimento", () => {
  const source = readFileSync(resolve(process.cwd(), "server/_core/localDevAuth.ts"), "utf8");

  it("depende de development, habilitação explícita e e-mail local", () => {
    expect(source).toContain('process.env.NODE_ENV === "development"');
    expect(source).toContain('process.env.OJU_LOCAL_DEV_LOGIN_ENABLED === "true"');
    expect(source).toContain('OJU_LOCAL_ADMIN_EMAIL');
    expect(source).not.toContain('OJU_LOCAL_DEV_LOGIN_SECRET');
  });

  it("oculta as rotas fora do desenvolvimento e informa o modo automático", () => {
    expect(source).toContain('return res.sendStatus(404)');
    expect(source).toContain('automatic: localDevAuthEnabled()');
  });

  it("emite uma sessão local curta de administrador principal", () => {
    expect(source).toContain('const SESSION_DURATION_MS = 8 * 60 * 60 * 1000');
    expect(source).toContain('res.cookie(COOKIE_NAME, token');
    expect(source).toContain('name: "Administrador local de desenvolvimento"');
  });
});
