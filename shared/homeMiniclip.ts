import { HOME_MINICLIP_MAX_DURATION_SECONDS, HOME_MINICLIP_MUTE_STORAGE_KEY } from "./const";

export const captionTrackUrlSchemaPattern = /^\/(media-storage|manus-storage|oju-assets)\/[A-Za-z0-9._\-/]+\.vtt$/i;

export function isAllowedCaptionTrackUrl(value: string) {
  return captionTrackUrlSchemaPattern.test(value.trim());
}

export function parseCaptionTrackUrl(terms?: string | null): string | null {
  if (!terms) return null;
  try {
    const parsed = JSON.parse(terms) as { captionTrackUrl?: unknown };
    if (typeof parsed?.captionTrackUrl !== "string") return null;
    const url = parsed.captionTrackUrl.trim();
    return isAllowedCaptionTrackUrl(url) ? url : null;
  } catch {
    return null;
  }
}

export function encodeBackgroundClipTerms(captionTrackUrl?: string | null): string | null {
  const url = captionTrackUrl?.trim();
  if (!url) return null;
  if (!isAllowedCaptionTrackUrl(url)) return null;
  return JSON.stringify({ captionTrackUrl: url });
}

export function parseWatchStartSeconds(search: string): number {
  const value = Number(new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("t"));
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), HOME_MINICLIP_MAX_DURATION_SECONDS);
}

export function buildMiniclipWatchUrl(id: number | undefined, assetUrl: string, currentTime: number) {
  const start = Math.floor(Math.max(0, currentTime));
  if (!id) return start > 0 ? `${assetUrl}#t=${start}` : assetUrl;
  return start > 0 ? `/miniclipe/${id}?t=${start}` : `/miniclipe/${id}`;
}

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };

export function persistHomeMiniclipMutedPreference(muted: boolean, storage?: StorageLike | null) {
  if (!storage) return;
  if (muted) storage.setItem(HOME_MINICLIP_MUTE_STORAGE_KEY, "1");
  else storage.removeItem(HOME_MINICLIP_MUTE_STORAGE_KEY);
}

export function sessionStorageOrNull(): StorageLike | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export type HomeMiniclipCurationAction = "watch" | "mute" | "unmute";

export type HomeMiniclipCurationSignals = {
  watch: number;
  mute: number;
  unmute: number;
  byMedia: Record<string, { watch: number; mute: number; unmute: number }>;
};

export function emptyHomeMiniclipCurationSignals(): HomeMiniclipCurationSignals {
  return { watch: 0, mute: 0, unmute: 0, byMedia: {} };
}

export function parseHomeMiniclipCurationSignals(value?: string | null): HomeMiniclipCurationSignals {
  try {
    const parsed = JSON.parse(value || "") as Partial<HomeMiniclipCurationSignals>;
    const next = emptyHomeMiniclipCurationSignals();
    next.watch = Number(parsed.watch) || 0;
    next.mute = Number(parsed.mute) || 0;
    next.unmute = Number(parsed.unmute) || 0;
    if (parsed.byMedia && typeof parsed.byMedia === "object") {
      for (const [mediaId, counts] of Object.entries(parsed.byMedia)) {
        next.byMedia[mediaId] = {
          watch: Number(counts?.watch) || 0,
          mute: Number(counts?.mute) || 0,
          unmute: Number(counts?.unmute) || 0,
        };
      }
    }
    return next;
  } catch {
    return emptyHomeMiniclipCurationSignals();
  }
}

export function incrementHomeMiniclipCurationSignal(
  current: HomeMiniclipCurationSignals,
  action: HomeMiniclipCurationAction,
  mediaId?: number,
): HomeMiniclipCurationSignals {
  const next: HomeMiniclipCurationSignals = {
    watch: current.watch,
    mute: current.mute,
    unmute: current.unmute,
    byMedia: { ...current.byMedia },
  };
  next[action] += 1;
  if (mediaId && mediaId > 0) {
    const key = String(mediaId);
    const existing = next.byMedia[key] || { watch: 0, mute: 0, unmute: 0 };
    next.byMedia[key] = { ...existing, [action]: existing[action] + 1 };
  }
  return next;
}

const curationSignalHits = new Map<string, number[]>();

export function allowAnonymousCurationSignal(ip: string, now = Date.now(), windowMs = 60_000, maxHits = 20) {
  const key = ip || "unknown";
  const hits = (curationSignalHits.get(key) || []).filter(stamp => now - stamp < windowMs);
  if (hits.length >= maxHits) {
    curationSignalHits.set(key, hits);
    return false;
  }
  hits.push(now);
  curationSignalHits.set(key, hits);
  return true;
}

export function resetAnonymousCurationSignalWindow() {
  curationSignalHits.clear();
}
