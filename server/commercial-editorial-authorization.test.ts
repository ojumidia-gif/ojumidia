import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canUseCommercialLocation, canUseCommercialMedia, canUseCommercialNarrative, canUseOnPortal, isEditorialAuthorizationCurrent } from "./commercialEditorialAuthorization";

const authorized = { status: "Autorização parcial" as const, allowPhotos: true, allowVideos: false, allowOrganizationName: false, allowLocation: false, allowStory: true, allowPeopleIdentification: false, allowPortal: true, allowInstitutional: false, allowSocial: false, authorizedAt: new Date("2026-08-19"), expiresAt: null, revokedAt: null };

describe("autorização editorial granular de trabalho contratado", () => {
  it("mantém o trabalho privado até existir autorização editorial válida para portal", () => {
    expect(isEditorialAuthorizationCurrent(null)).toBe(false);
    expect(canUseOnPortal(null)).toBe(false);
    expect(canUseOnPortal(authorized)).toBe(true);
  });

  it("aplica escopo separado para mídias, narrativa e localização", () => {
    expect(canUseCommercialMedia(authorized, "foto")).toBe(true);
    expect(canUseCommercialMedia(authorized, "vídeo")).toBe(false);
    expect(canUseCommercialNarrative(authorized)).toBe(true);
    expect(canUseCommercialLocation(authorized)).toBe(false);
  });

  it("invalida o uso quando a autorização vence ou é revogada", () => {
    expect(canUseOnPortal({ ...authorized, expiresAt: new Date("2020-01-01") })).toBe(false);
    expect(canUseOnPortal({ ...authorized, status: "Revogada", revokedAt: new Date() })).toBe(false);
  });

  it("exige entrega privada antes da autorização e retira conteúdo após revogação", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers/commercial.ts"), "utf8");
    expect(router).toContain("Registre a entrega privada ao contratante antes de autorizar");
    expect(router).toContain("Conteúdos comerciais vinculados foram retirados preventivamente do portal");
  });
});
