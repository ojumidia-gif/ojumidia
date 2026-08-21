import { describe, expect, it } from "vitest";
import { canAccessRevenueLead } from "./revenue";

describe("isolamento da carteira de receitas documentais", () => {
  it("mantém apoio, licenciamento e oficina acessíveis apenas ao responsável", () => {
    expect(canAccessRevenueLead("administrador", 10, 10)).toBe(true);
    expect(canAccessRevenueLead("administrador", 10, 11)).toBe(false);
    expect(canAccessRevenueLead("administrador", 10, null)).toBe(false);
  });

  it("preserva a visão consolidada exclusivamente para o administrador principal", () => {
    expect(canAccessRevenueLead("administrador principal", 10, 11)).toBe(true);
    expect(canAccessRevenueLead("administrador principal", 10, null)).toBe(true);
  });

  it("não permite que papéis editoriais comuns acessem uma oportunidade alheia", () => {
    expect(canAccessRevenueLead("editor", 10, 11)).toBe(false);
    expect(canAccessRevenueLead("criador", 10, 11)).toBe(false);
  });
});
