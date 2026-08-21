import { describe, expect, it } from "vitest";

describe("configuração de administrador local", () => {
  it("disponibiliza o e-mail administrativo somente para a camada do servidor", () => {
    const configuredEmail = process.env.OJU_LOCAL_ADMIN_EMAIL?.trim().toLowerCase();
    expect(configuredEmail).toBe("aquinopratesr@gmail.com");
  });
});
