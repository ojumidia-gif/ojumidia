import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("sequência do fundo vivo", () => {
  it("mantém um vídeo visível por vez e aplica a duração configurada de transição", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const playback = readFileSync(resolve(process.cwd(), "client/src/hooks/useHomeMiniclipPlayback.ts"), "utf8");
    const admin = readFileSync(resolve(process.cwd(), "client/src/pages/admin/MiniclipsAdmin.tsx"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const watch = readFileSync(resolve(process.cwd(), "client/src/pages/MiniclipWatch.tsx"), "utf8");
    expect(home).toContain("heroVideos.map");
    expect(home).toContain("transitionDuration");
    expect(home).toContain("/oju-assets/orixas-transicao-ritual-cinematografica.mp4");
    expect(home).toContain("window.open");
    expect(home).toContain("buildMiniclipWatchUrl");
    expect(home).toContain("VolumeX");
    expect(home).toContain("Vídeo ·");
    expect(home).toContain('preload={index === heroIndex || (preloadNext && index === nextIndex) ? "auto" : "metadata"}');
    expect(home).toContain("persistHomeMiniclipMutedPreference");
    expect(home).toContain("recordHomeMiniclipSignal");
    expect(home).toContain("doNotTrack");
    expect(playback).toContain("visibilitychange");
    expect(playback).toContain("HOME_MINICLIP_PRELOAD_AHEAD_MS");
    expect(admin).toContain("Esta regra não é editável");
    expect(admin).toContain("homeMiniclipCuration");
    expect(admin).toContain('user?.role === "administrador principal"');
    expect(admin).not.toContain("saveHomeBackgroundConfig");
    expect(app).toContain("/miniclipe/:id");
    expect(watch).toContain("publicBackgroundClip");
    expect(watch).toContain("parseWatchStartSeconds");
    expect(watch).toContain('kind="subtitles"');
  });
});
