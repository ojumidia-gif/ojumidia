import { describe, expect, it } from "vitest";
import { HOME_MINICLIP_MUTE_STORAGE_KEY } from "@shared/const";
import {
  allowAnonymousCurationSignal,
  buildMiniclipWatchUrl,
  encodeBackgroundClipTerms,
  incrementHomeMiniclipCurationSignal,
  parseCaptionTrackUrl,
  parseWatchStartSeconds,
  persistHomeMiniclipMutedPreference,
  resetAnonymousCurationSignalWindow,
} from "@shared/homeMiniclip";

describe("experiência profissional do fundo vivo", () => {
  it("abre o miniclipe completo com timecode e rejeita faixa de legenda externa", () => {
    expect(buildMiniclipWatchUrl(12, "/media-storage/a.mp4", 8.9)).toBe("/miniclipe/12?t=8");
    expect(buildMiniclipWatchUrl(undefined, "/oju-assets/fallback.mp4", 4)).toBe("/oju-assets/fallback.mp4#t=4");
    expect(parseWatchStartSeconds("?t=40")).toBe(40);
    expect(parseWatchStartSeconds("?t=-2")).toBe(0);
    expect(parseCaptionTrackUrl(encodeBackgroundClipTerms("/media-storage/casa/miniclipe.vtt"))).toBe("/media-storage/casa/miniclipe.vtt");
    expect(encodeBackgroundClipTerms("https://evil.example/track.vtt")).toBeNull();
  });

  it("persiste só o mudo na sessão e nunca o som ligado", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    };
    persistHomeMiniclipMutedPreference(false, storage);
    expect(memory.has(HOME_MINICLIP_MUTE_STORAGE_KEY)).toBe(false);
    persistHomeMiniclipMutedPreference(true, storage);
    expect(memory.get(HOME_MINICLIP_MUTE_STORAGE_KEY)).toBe("1");
  });

  it("conta sinais de curadoria sem identidade e limita rajadas anônimas", () => {
    resetAnonymousCurationSignalWindow();
    const next = incrementHomeMiniclipCurationSignal({ watch: 1, mute: 0, unmute: 0, byMedia: {} }, "watch", 7);
    expect(next.watch).toBe(2);
    expect(next.byMedia["7"]?.watch).toBe(1);
    for (let index = 0; index < 20; index += 1) expect(allowAnonymousCurationSignal("10.0.0.1", 1_000 + index)).toBe(true);
    expect(allowAnonymousCurationSignal("10.0.0.1", 1_500)).toBe(false);
    expect(allowAnonymousCurationSignal("10.0.0.2", 1_500)).toBe(true);
  });
});
