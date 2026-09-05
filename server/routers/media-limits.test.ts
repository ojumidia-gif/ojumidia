import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canAttachWithinMediaLimit } from "./editorial";
import { canActivateBackgroundClip, defaultHeroTransition, heroTransitionSchema } from "./media";

describe("limites documentais e fundo vivo", () => {
  const routerSource = readFileSync(resolve(process.cwd(), "server/routers/media.ts"), "utf8");
  it("mantém a fotografia documental restrita a cinco imagens e nenhum vídeo", () => {
    expect(canAttachWithinMediaLimit({ contentKind: "Fotografia documental", mediaType: "foto", photoLimit: 5, videoLimit: 0, attachedPhotoCount: 4, attachedVideoCount: 0 })).toBe(true);
    expect(canAttachWithinMediaLimit({ contentKind: "Fotografia documental", mediaType: "foto", photoLimit: 5, videoLimit: 0, attachedPhotoCount: 5, attachedVideoCount: 0 })).toBe(false);
    expect(canAttachWithinMediaLimit({ contentKind: "Fotografia documental", mediaType: "vídeo", photoLimit: 5, videoLimit: 0, attachedPhotoCount: 0, attachedVideoCount: 0 })).toBe(false);
  });

  it("aplica o limite uniforme de cinco fotos e dois vídeos às Coberturas e Histórias", () => {
    expect(canAttachWithinMediaLimit({ contentKind: "Cobertura", mediaType: "foto", photoLimit: 2, videoLimit: 1, attachedPhotoCount: 4, attachedVideoCount: 0 })).toBe(true);
    expect(canAttachWithinMediaLimit({ contentKind: "História", mediaType: "foto", photoLimit: 2, videoLimit: 1, attachedPhotoCount: 5, attachedVideoCount: 0 })).toBe(false);
    expect(canAttachWithinMediaLimit({ contentKind: "História", mediaType: "vídeo", photoLimit: 2, videoLimit: 1, attachedPhotoCount: 0, attachedVideoCount: 1 })).toBe(true);
    expect(canAttachWithinMediaLimit({ contentKind: "Cobertura", mediaType: "vídeo", photoLimit: 2, videoLimit: 1, attachedPhotoCount: 0, attachedVideoCount: 2 })).toBe(false);
  });

  it("aceita no fundo vivo somente vídeo ativo e autorizado", () => {
    expect(canActivateBackgroundClip({ mediaType: "vídeo", publicationAllowed: true, state: "Ativo" })).toBe(true);
    expect(canActivateBackgroundClip({ mediaType: "foto", publicationAllowed: true, state: "Ativo" })).toBe(false);
    expect(canActivateBackgroundClip({ mediaType: "vídeo", publicationAllowed: false, state: "Ativo" })).toBe(false);
  });

  it("mantém a transição do fundo vivo dentro de um intervalo controlado", () => {
    expect(heroTransitionSchema.parse(defaultHeroTransition)).toEqual(defaultHeroTransition);
    expect(heroTransitionSchema.safeParse({ displaySeconds: 4, transitionMilliseconds: 1100 }).success).toBe(false);
    expect(heroTransitionSchema.safeParse({ displaySeconds: 14, transitionMilliseconds: 3100 }).success).toBe(false);
    expect(heroTransitionSchema.safeParse({ displaySeconds: 18, transitionMilliseconds: 800 }).success).toBe(true);
  });

  it("emite eventos para manter o portal sincronizado com o Acervo", () => {
    expect(routerSource).toContain("media-created");
    expect(routerSource).toContain("media-updated");
    expect(routerSource).toContain("media-trashed");
    expect(routerSource).toContain("media-restored");
    expect(routerSource).toContain("media-permanently-purged");
    expect(routerSource).toContain("background-clip-updated");
    expect(routerSource).toContain("home-background-config-updated");
  });
});
