import { describe, expect, it } from "vitest";
import { nextEditorialAction } from "./editorialFlow";

describe("próximo passo editorial", () => {
  it("não deixa criador publicar sem aprovação", () => {
    expect(nextEditorialAction("criador", "Rascunho")?.label).toBe("Enviar para revisão");
    expect(nextEditorialAction("criador", "Aprovada")).toBeNull();
    expect(nextEditorialAction("administrador", "Em revisão")?.label).toBe("Aprovar");
    expect(nextEditorialAction("administrador", "Aprovada")?.label).toBe("Publicar no site");
  });
});
