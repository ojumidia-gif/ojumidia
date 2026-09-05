import { describe, expect, it } from "vitest";
import {
  canAdvanceStatus,
  canEditPublication,
  canPublishDirect,
  nextEditorialAction,
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

  it("permite administradores publicarem direto no portal", () => {
    expect(canPublishDirect("administrador")).toBe(true);
    expect(canPublishDirect("administrador principal")).toBe(true);
    expect(canPublishDirect("aprovador")).toBe(false);
    expect(canPublishDirect("criador")).toBe(false);
  });

  it("mostra só a próxima etapa, sem pular a aprovação", () => {
    expect(nextEditorialAction("criador", "Rascunho")?.label).toBe("Enviar para revisão");
    expect(nextEditorialAction("criador", "Aprovada")).toBeNull();
    expect(nextEditorialAction("aprovador", "Em revisão")?.label).toBe("Aprovar");
    expect(nextEditorialAction("administrador", "Aprovada")?.label).toBe("Publicar no site");
    expect(nextEditorialAction("administrador", "Rascunho")?.label).toBe("Enviar para revisão");
  });
});
