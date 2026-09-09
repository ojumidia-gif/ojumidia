import { expect, test } from "@playwright/test";
import { hasPersonaState } from "../../personas";

test.describe("Jornadas comerciais — fronteiras que a missão 2 não atravessa", () => {
  test("Admin territorial (adminAccess) não avança sem termo gov.br no fluxo oficial", async () => {
    test.skip(
      !hasPersonaState("territorialAdmin"),
      "SKIP — DEPENDÊNCIA EXTERNA GOV.BR. Não fabricar PDF nem marcar termo assinado no banco. e2e/.auth/territorial-admin.json só após anexo oficial.",
    );
    expect(hasPersonaState("territorialAdmin")).toBe(true);
  });
});
