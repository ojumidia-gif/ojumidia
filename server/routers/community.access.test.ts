import { describe, expect, it } from "vitest";
import { canAccessCommunityRecord } from "./community";

describe("governança comunitária por carteira", () => {
  it("restringe instituições, eventos, memórias e acolhimentos ao administrador responsável", () => {
    expect(canAccessCommunityRecord("administrador", 10, 10)).toBe(true);
    expect(canAccessCommunityRecord("administrador", 10, 11)).toBe(false);
    expect(canAccessCommunityRecord("administrador", 10, null)).toBe(false);
  });

  it("mantém a visão consolidada para o administrador principal", () => {
    expect(canAccessCommunityRecord("administrador principal", 10, 11)).toBe(true);
    expect(canAccessCommunityRecord("administrador principal", 10, null)).toBe(true);
  });

  it("não concede a carteira a funções editoriais sem responsabilidade administrativa", () => {
    expect(canAccessCommunityRecord("editor", 10, 10)).toBe(true);
    expect(canAccessCommunityRecord("editor", 10, 11)).toBe(false);
    expect(canAccessCommunityRecord("criador", 10, 11)).toBe(false);
  });
});
