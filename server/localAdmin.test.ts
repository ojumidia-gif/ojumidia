import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("configuração de administrador local", () => {
  it("disponibiliza o e-mail administrativo somente para a camada do servidor", () => {
    const source = readFileSync(resolve(process.cwd(), "server/_core/localDevAuth.ts"), "utf8");
    const envTemplate = readFileSync(resolve(process.cwd(), "ENVIRONMENT_TEMPLATE.md"), "utf8");
    expect(source).toContain("OJU_LOCAL_ADMIN_EMAIL");
    expect(source).not.toContain("import.meta.env");
    expect(envTemplate).toContain("OJU_LOCAL_ADMIN_EMAIL=aquinopratesr@gmail.com");
  });
});
