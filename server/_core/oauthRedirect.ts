import type { Request } from "express";
import { ENV } from "./env";

export const GOOGLE_OAUTH_CALLBACK_PATH = "/api/auth/google/callback";
export const GOOGLE_OAUTH_START_PATH = "/api/auth/google/start";

const KNOWN_PUBLIC_HOSTS = ["ojumidia.com.br", "www.ojumidia.com.br"];

function parseCsv(value: string | undefined) {
  return (value ?? "").split(",").map(entry => entry.trim()).filter(Boolean);
}

function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/\.$/, "").replace(/:\d+$/, "");
}

function originOf(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function hostOf(url: string) {
  try {
    return normalizeHost(new URL(url).hostname);
  } catch {
    return "";
  }
}

function siblingHost(host: string) {
  if (host.startsWith("www.")) return host.slice(4);
  if (host.includes(".")) return `www.${host}`;
  return "";
}

function callbackUriForOrigin(origin: string) {
  return `${origin.replace(/\/+$/, "")}${GOOGLE_OAUTH_CALLBACK_PATH}`;
}

function configuredRedirectUri() {
  return (process.env.GOOGLE_OAUTH_REDIRECT_URI ?? ENV.googleOAuthRedirectUri).trim().replace(/\/$/, "");
}

export function allowedOAuthRedirectUris(
  env: { googleOAuthRedirectUri: string; publicBaseUrl?: string; extraRedirectUris?: string } = {
    googleOAuthRedirectUri: configuredRedirectUri(),
    publicBaseUrl: process.env.OJU_PUBLIC_BASE_URL,
    extraRedirectUris: process.env.GOOGLE_OAUTH_REDIRECT_URIS,
  },
) {
  const uris = new Set<string>();
  const seeds = [
    env.googleOAuthRedirectUri,
    env.publicBaseUrl ? callbackUriForOrigin(env.publicBaseUrl) : "",
    ...parseCsv(env.extraRedirectUris),
    ...KNOWN_PUBLIC_HOSTS.map(host => `https://${host}${GOOGLE_OAUTH_CALLBACK_PATH}`),
  ];
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
      const sibling = siblingHost(normalizeHost(url.hostname));
      if (sibling && !url.hostname.endsWith(".onrender.com")) {
        url.hostname = sibling;
        uris.add(url.toString().replace(/\/$/, ""));
      }
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
  const forwardedHost = req.headers["x-forwarded-host"];
  const hostHeader = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.get("host") || req.hostname;
  const host = normalizeHost(String(hostHeader || "").split(",")[0] || "");
  return host ? `${proto}://${host}` : "";
}

export function requestOAuthCallbackUri(req: Pick<Request, "protocol" | "get" | "hostname" | "headers">) {
  const origin = requestPublicOrigin(req);
  return origin ? callbackUriForOrigin(origin) : "";
}

export function resolveOAuthRedirectUri(req: Pick<Request, "protocol" | "get" | "hostname" | "headers">) {
  const configured = configuredRedirectUri();
  const incoming = requestOAuthCallbackUri(req);
  const allowed = allowedOAuthRedirectUris();
  if (incoming && allowed.has(incoming)) {
    const incomingHost = hostOf(incoming);
    const configuredHost = hostOf(configured);
    if (configured && (incomingHost === configuredHost || siblingHost(incomingHost) === configuredHost)) {
      return configured;
    }
    return incoming;
  }
  return configured;
}

export function oauthStartBounceUrl(req: Pick<Request, "protocol" | "get" | "hostname" | "headers">, redirectUri: string) {
  const incomingOrigin = requestPublicOrigin(req);
  const targetOrigin = originOf(redirectUri);
  if (!incomingOrigin || !targetOrigin || incomingOrigin === targetOrigin) return null;
  return `${targetOrigin}${GOOGLE_OAUTH_START_PATH}`;
}

export function isAllowedOAuthRedirectUri(uri: string) {
  return allowedOAuthRedirectUris().has(uri.trim().replace(/\/$/, ""));
}
