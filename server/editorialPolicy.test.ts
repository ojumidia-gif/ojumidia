import { describe, expect, it } from "vitest";
import {
  canAdvanceStatus,
  canEditPublication,
  nextEditorialStatus,
} from "./editorialPolicy";

describe("ciclo editorial da Ojú Mídia", () => {
  it("preserva a sequência editorial definida", () => {
    expect(nextEditorialStatus("Rascunho")).toBe("Em revisão");
    expect(nextEditorialStatus("Em revisão")).toBe("Aprovada");
    expect(nextEditorialStatus("Aprovada")).toBe("Publicada");
    expect(nextEditorialStatus("Publicada")).toBe("Arquivada");
    expect(nextEditorialStatus("Arquivada")).toBeNull();
  });

  it("restringe os avanços a papéis editoriais autorizados", () => {
    expect(canAdvanceStatus("criador", "Rascunho")).toBe(true);
    expect(canAdvanceStatus("editor", "Em revisão")).toBe(false);
    expect(canAdvanceStatus("aprovador", "Em revisão")).toBe(true);
    expect(canAdvanceStatus("administrador", "Aprovada")).toBe(true);
  });

  it("permite edição somente nas etapas apropriadas", () => {
    expect(canEditPublication("criador", "Rascunho")).toBe(true);
    expect(canEditPublication("editor", "Em revisão")).toBe(true);
    expect(canEditPublication("criador", "Aprovada")).toBe(false);
    expect(canEditPublication("administrador", "Arquivada")).toBe(true);
  });
});
