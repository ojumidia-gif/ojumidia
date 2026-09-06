export function normalizeInstagramHandle(raw?: string | null): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  const withoutUrl = trimmed
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^@/, "")
    .trim();
  if (!/^[A-Za-z0-9._]{1,30}$/.test(withoutUrl)) return null;
  return withoutUrl.toLowerCase();
}

export function instagramProfileUrl(handle: string) {
  return `https://instagram.com/${handle}`;
}

export function instagramHandleLabel(handle: string) {
  return `@${handle}`;
}
