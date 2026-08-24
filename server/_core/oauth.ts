import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState, encodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV, isGoogleOAuthConfigured } from "./env";
import { sdk } from "./sdk";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const LOCAL_OAUTH_STATE_COOKIE = "oauth_state";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function oauthStateCookieName(cookieOptions: ReturnType<typeof getSessionCookieOptions>) {
  return cookieOptions.secure ? OAUTH_STATE_COOKIE : LOCAL_OAUTH_STATE_COOKIE;
}

function readOAuthStateCookie(req: Request, cookieOptions: ReturnType<typeof getSessionCookieOptions>) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  return cookies[oauthStateCookieName(cookieOptions)] ?? cookies[OAUTH_STATE_COOKIE] ?? cookies[LOCAL_OAUTH_STATE_COOKIE];
}

function splitPackedNonce(packed: string | undefined) {
  if (!packed) return { state: "", nonce: "" };
  const separator = packed.indexOf(".");
  if (separator < 0) return { state: packed, nonce: "" };
  return { state: packed.slice(0, separator), nonce: packed.slice(separator + 1) };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/google/start", (req: Request, res: Response) => {
    if (!isGoogleOAuthConfigured()) {
      res.status(503).json({ error: "google_oauth_not_configured" });
      return;
    }

    const state = randomUUID();
    const nonce = randomUUID();
    const cookieOptions = getSessionCookieOptions(req);
    const packedState = encodeOAuthState({
      redirectUri: ENV.googleOAuthRedirectUri,
      nonce: `${state}.${nonce}`,
    });

    res.cookie(oauthStateCookieName(cookieOptions), packedState, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", ENV.googleOAuthRedirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("prompt", "select_account");

    res.redirect(302, url.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const cookieOptions = getSessionCookieOptions(req);
    const stateCookieName = oauthStateCookieName(cookieOptions);

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const packedCookie = readOAuthStateCookie(req, cookieOptions);
    const { nonce: packedNonce } = decodeOAuthState(packedCookie ?? "");
    const expected = splitPackedNonce(packedNonce);

    if (!expected.state || expected.state !== state || !expected.nonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }

    res.clearCookie(stateCookieName, { ...cookieOptions, maxAge: -1 });
    res.clearCookie(OAUTH_STATE_COOKIE, { ...cookieOptions, maxAge: -1 });
    res.clearCookie(LOCAL_OAUTH_STATE_COOKIE, { ...cookieOptions, maxAge: -1 });

    try {
      if (!isGoogleOAuthConfigured()) {
        res.status(503).json({ error: "google_oauth_not_configured" });
        return;
      }

      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: ENV.googleOAuthRedirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        console.error("[OAuth] Google token exchange failed", await tokenResponse.text());
        res.status(502).json({ error: "OAuth callback failed" });
        return;
      }

      const tokenPayload = (await tokenResponse.json()) as { id_token?: string };
      if (!tokenPayload.id_token) {
        res.status(400).json({ error: "id_token missing from Google response" });
        return;
      }

      const { payload } = await jwtVerify(tokenPayload.id_token, GOOGLE_JWKS, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: ENV.googleClientId,
      });

      const sub = typeof payload.sub === "string" ? payload.sub : "";
      const email = typeof payload.email === "string" ? payload.email : null;
      const name = typeof payload.name === "string" ? payload.name : "";
      const emailVerified = payload.email_verified === true;
      const tokenNonce = typeof payload.nonce === "string" ? payload.nonce : "";

      if (!sub || tokenNonce !== expected.nonce) {
        res.status(403).json({ error: "invalid oauth nonce" });
        return;
      }

      if (!emailVerified || !email) {
        res.status(403).json({ error: "google_email_not_verified" });
        return;
      }

      const openId = `google:${sub}`;

      await db.upsertUser({
        openId,
        name: name || null,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || email,
        expiresInMs: ONE_YEAR_MS,
      });

      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, "/admin");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
