import type { Request } from "express";
import { ENV } from "./env";

export const GOOGLE_OAUTH_CALLBACK_PATH = "/api/auth/google/callback";
export const GOOGLE_OAUTH_START_PATH = "/api/auth/google/start";

function parseCsv(value: string | undefined) {
  return (value ?? "").split(",").map(entry => entry.trim()).filter(Boolean);
}

function originOf(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function callbackUriForOrigin(origin: string) {
  return `${origin.replace(/\/+$/, "")}${GOOGLE_OAUTH_CALLBACK_PATH}`;
}

function configuredRedirectUri() {
  return (process.env.GOOGLE_OAUTH_REDIRECT_URI ?? ENV.googleOAuthRedirectUri).trim().replace(/\/$/, "");
}

function hostHeader(req: Pick<Request, "get" | "hostname" | "headers">) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const raw = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.get("host") || req.hostname;
  return String(raw || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

export function allowedOAuthRedirectUris(
  env: { googleOAuthRedirectUri: string; extraRedirectUris?: string } = {
    googleOAuthRedirectUri: configuredRedirectUri(),
    extraRedirectUris: process.env.GOOGLE_OAUTH_REDIRECT_URIS,
  },
) {
  const uris = new Set<string>();
  const seeds = [env.googleOAuthRedirectUri, ...parseCsv(env.extraRedirectUris)];
  for (const seed of seeds) {
    const value = seed.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      url.pathname = GOOGLE_OAUTH_CALLBACK_PATH;
      url.search = "";
      url.hash = "";
      uris.add(url.toString().replace(/\/$/, ""));
    } catch {
      /* ignore malformed seeds */
    }
  }
  return uris;
}

export function requestPublicOrigin(req: Pick<Request, "protocol" | "get" | "hostname" | "headers">) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto?.split(",") ?? [];
  const proto = protoList.map(item => item.trim().toLowerCase()).includes("https") || req.protocol === "https"
    ? "https"
    : "http";
  const host = hostHeader(req);
  return host ? `${proto}://${host}` : "";
}

export function requestOAuthCallbackUri(req: Pick<Request, "protocol" | "get" | "hostname" | "headers">) {
  const origin = requestPublicOrigin(req);
  return origin ? callbackUriForOrigin(origin) : "";
}

export function isAllowedOAuthRedirectUri(uri: string) {
  return allowedOAuthRedirectUris().has(uri.trim().replace(/\/$/, ""));
}

export function resolveOAuthRedirectUri(req?: Pick<Request, "protocol" | "get" | "hostname" | "headers">) {
  const fallback = configuredRedirectUri();
  if (!req) return fallback;
  const incoming = requestOAuthCallbackUri(req);
  if (incoming && isAllowedOAuthRedirectUri(incoming)) return incoming;
  return fallback;
}

export function oauthStartBounceUrl(req: Pick<Request, "protocol" | "get" | "hostname" | "headers">, redirectUri: string) {
  const incomingOrigin = requestPublicOrigin(req);
  const targetOrigin = originOf(redirectUri);
  if (!incomingOrigin || !targetOrigin || incomingOrigin === targetOrigin) return null;
  return `${targetOrigin}${GOOGLE_OAUTH_START_PATH}`;
}
