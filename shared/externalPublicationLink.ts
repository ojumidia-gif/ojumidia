export const EXTERNAL_HTTP_URL_MAX = 2048;
export const EXTERNAL_LABEL_MAX = 80;

const DISALLOWED_SCHEME = /^(javascript|data|vbscript|file|blob|about|mailto|tel):/i;
const DISALLOWED_LABEL = /[\u0000-\u001f<>`\\]|javascript:|data:|vbscript:|on\w+\s*=|https?:\/\/|www\.|&lt;|&gt;|&quot;/i;

export type EditorialPublicationKind = "História" | "Cobertura" | "Documentário" | "Projeto" | "Fotografia documental";

export type CompleteProductionLink = {
  url: string;
  label: string;
};

export function sanitizeExternalHttpUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > EXTERNAL_HTTP_URL_MAX) return null;
  if (/[\s<>"'`]/.test(trimmed)) return null;
  if (DISALLOWED_SCHEME.test(trimmed) || /javascript:|data:/i.test(trimmed)) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (!parsed.hostname) return null;
  return parsed.toString();
}

export function parseStoredExternalHttpUrl(value: string | null): { ok: true; value: string | null } | { ok: false } {
  if (value == null || !value.trim()) return { ok: true, value: null };
  const sanitized = sanitizeExternalHttpUrl(value);
  if (!sanitized) return { ok: false };
  return { ok: true, value: sanitized };
}

export function parseStoredExternalLabel(value: string | null): { ok: true; value: string | null } | { ok: false } {
  if (value == null || !value.trim()) return { ok: true, value: null };
  const normalized = value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(?:\s*→)+\s*$/, "")
    .trim();
  if (!normalized) return { ok: true, value: null };
  if (normalized.length > EXTERNAL_LABEL_MAX) return { ok: false };
  if (DISALLOWED_LABEL.test(normalized) || /\]\(/.test(normalized)) return { ok: false };
  return { ok: true, value: normalized };
}

/** Ponto único de fallback do CTA. O portal só renderiza o `label` já resolvido. */
export function completeProductionLabel(kind: string, slot: "album" | "video"): string {
  if (slot === "video") {
    return kind === "Documentário" ? "Ver documentário completo" : "Assistir versão completa";
  }
  if (kind === "História") return "Ver história completa";
  if (kind === "Cobertura") return "Ver álbum completo";
  if (kind === "Documentário") return "Ver documentário completo";
  if (kind === "Projeto") return "Ver projeto completo";
  if (kind === "Fotografia documental") return "Ver produção completa";
  return "Ver produção completa";
}

export function resolveCompleteProductionLabel(kind: string, slot: "album" | "video", custom?: string | null): string {
  const parsed = parseStoredExternalLabel(custom ?? null);
  if (parsed.ok && parsed.value) return parsed.value;
  return completeProductionLabel(kind, slot);
}

export function toPublicCompleteProductions(input: {
  contentKind: string;
  externalAlbumUrl?: string | null;
  externalVideoUrl?: string | null;
  externalAlbumLabel?: string | null;
  externalVideoLabel?: string | null;
}): CompleteProductionLink[] {
  const links: CompleteProductionLink[] = [];
  const album = sanitizeExternalHttpUrl(input.externalAlbumUrl);
  const video = sanitizeExternalHttpUrl(input.externalVideoUrl);
  if (album) {
    links.push({
      url: album,
      label: resolveCompleteProductionLabel(input.contentKind, "album", input.externalAlbumLabel),
    });
  }
  if (video && video !== album) {
    links.push({
      url: video,
      label: resolveCompleteProductionLabel(input.contentKind, "video", input.externalVideoLabel),
    });
  }
  return links;
}
