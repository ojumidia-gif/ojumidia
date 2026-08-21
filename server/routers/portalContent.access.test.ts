import { describe, expect, it } from "vitest";
import { canManagePortalContent } from "./portalContent";

describe("conteúdo institucional do portal", () => {
  it("permite edição, ordem, visibilidade e exclusão somente ao administrador principal", () => {
    expect(canManagePortalContent("administrador principal")).toBe(true);
    expect(canManagePortalContent("administrador")).toBe(false);
    expect(canManagePortalContent("editor")).toBe(false);
    expect(canManagePortalContent("aprovador")).toBe(false);
    expect(canManagePortalContent("criador")).toBe(false);
  });
});
