import { afterEach, describe, expect, it } from "vitest";
import { encodeOAuthState, decodeOAuthState } from "@shared/const";
import {
  allowedOAuthRedirectUris,
  isAllowedOAuthRedirectUri,
  oauthStartBounceUrl,
  resolveOAuthRedirectUri,
} from "./_core/oauthRedirect";

const CANONICAL = "https://ojumidia.onrender.com/api/auth/google/callback";
const OFFICIAL = "https://ojumidia.com.br/api/auth/google/callback";
const WWW = "https://www.ojumidia.com.br/api/auth/google/callback";
const EXTRAS = `${OFFICIAL},${WWW}`;

function fakeReq(host: string, proto = "https") {
  return {
    protocol: proto,
    hostname: host,
    headers: { "x-forwarded-proto": proto, "x-forwarded-host": host },
    get(name: string) {
      return name.toLowerCase() === "host" ? host : undefined;
    },
  };
}

function restoreEnv(key: string, previous: string | undefined) {
  if (previous === undefined) delete process.env[key];
  else process.env[key] = previous;
}

function withOAuthEnv(values: { redirect?: string; extras?: string | undefined }, run: () => void) {
  const previousRedirect = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const previousExtras = process.env.GOOGLE_OAUTH_REDIRECT_URIS;
  process.env.GOOGLE_OAUTH_REDIRECT_URI = values.redirect ?? CANONICAL;
  if (values.extras === undefined) delete process.env.GOOGLE_OAUTH_REDIRECT_URIS;
  else process.env.GOOGLE_OAUTH_REDIRECT_URIS = values.extras;
  try {
    run();
  } finally {
    restoreEnv("GOOGLE_OAUTH_REDIRECT_URI", previousRedirect);
    restoreEnv("GOOGLE_OAUTH_REDIRECT_URIS", previousExtras);
  }
}

describe("OAuth redirect cadastrado no Google", () => {
  it("só autoriza o callback configurado, sem inventar o domínio próprio", () => {
    const uris = allowedOAuthRedirectUris({
      googleOAuthRedirectUri: "https://ojumidia.onrender.com/api/auth/google/callback",
    });
    expect(uris.has("https://ojumidia.onrender.com/api/auth/google/callback")).toBe(true);
    expect(uris.has("https://ojumidia.com.br/api/auth/google/callback")).toBe(false);
  });

  it("envia ao Google exatamente o URI do ENV e desloca o login para esse host", () => {
    const previous = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://ojumidia.com.br/api/auth/google/callback";
    delete process.env.GOOGLE_OAUTH_REDIRECT_URIS;
    try {
      const req = fakeReq("www.ojumidia.com.br");
      expect(resolveOAuthRedirectUri(req)).toBe("https://ojumidia.com.br/api/auth/google/callback");
      expect(oauthStartBounceUrl(req, resolveOAuthRedirectUri(req))).toBe("https://ojumidia.com.br/api/auth/google/start");
    } finally {
      restoreEnv("GOOGLE_OAUTH_REDIRECT_URI", previous);
    }
  });
});

describe("OAuth redirect multi-domínio", () => {
  afterEach(() => {
    delete process.env.GOOGLE_OAUTH_REDIRECT_URIS;
  });

  it("no Render usa GOOGLE_OAUTH_REDIRECT_URI e não faz bounce", () => {
    withOAuthEnv({ extras: EXTRAS }, () => {
      const req = fakeReq("ojumidia.onrender.com");
      const uri = resolveOAuthRedirectUri(req);
      expect(uri).toBe(CANONICAL);
      expect(oauthStartBounceUrl(req, uri)).toBeNull();
    });
  });

  it("no domínio oficial usa o callback oficial quando a allowlist extra existe", () => {
    withOAuthEnv({ extras: EXTRAS }, () => {
      const req = fakeReq("ojumidia.com.br");
      const uri = resolveOAuthRedirectUri(req);
      expect(uri).toBe(OFFICIAL);
      expect(oauthStartBounceUrl(req, uri)).toBeNull();
    });
  });

  it("no www usa o callback www quando a allowlist extra existe", () => {
    withOAuthEnv({ extras: EXTRAS }, () => {
      const req = fakeReq("www.ojumidia.com.br");
      const uri = resolveOAuthRedirectUri(req);
      expect(uri).toBe(WWW);
      expect(oauthStartBounceUrl(req, uri)).toBeNull();
    });
  });

  it("host não autorizado não gera callback arbitrário e cai no fallback canônico", () => {
    withOAuthEnv({ extras: EXTRAS }, () => {
      const req = fakeReq("dominio-malicioso.com");
      const uri = resolveOAuthRedirectUri(req);
      expect(uri).toBe(CANONICAL);
      expect(uri).not.toContain("dominio-malicioso.com");
      expect(isAllowedOAuthRedirectUri("https://dominio-malicioso.com/api/auth/google/callback")).toBe(false);
      expect(oauthStartBounceUrl(req, uri)).toBe("https://ojumidia.onrender.com/api/auth/google/start");
    });
  });

  it("sem GOOGLE_OAUTH_REDIRECT_URIS o Render continua exatamente como antes", () => {
    withOAuthEnv({ extras: undefined }, () => {
      const render = fakeReq("ojumidia.onrender.com");
      expect(resolveOAuthRedirectUri(render)).toBe(CANONICAL);
      expect(oauthStartBounceUrl(render, resolveOAuthRedirectUri(render))).toBeNull();

      const official = fakeReq("ojumidia.com.br");
      expect(resolveOAuthRedirectUri(official)).toBe(CANONICAL);
      expect(isAllowedOAuthRedirectUri(OFFICIAL)).toBe(false);
      expect(oauthStartBounceUrl(official, resolveOAuthRedirectUri(official))).toBe("https://ojumidia.onrender.com/api/auth/google/start");
    });
  });

  it("com GOOGLE_OAUTH_REDIRECT_URIS reconhece os callbacks adicionais", () => {
    withOAuthEnv({ extras: EXTRAS }, () => {
      expect(isAllowedOAuthRedirectUri(CANONICAL)).toBe(true);
      expect(isAllowedOAuthRedirectUri(OFFICIAL)).toBe(true);
      expect(isAllowedOAuthRedirectUri(WWW)).toBe(true);
    });
  });

  it("o redirect_uri escolhido no start é o mesmo recuperado do state no callback", () => {
    withOAuthEnv({ extras: EXTRAS }, () => {
      const selected = resolveOAuthRedirectUri(fakeReq("ojumidia.com.br"));
      const packed = encodeOAuthState({ redirectUri: selected, nonce: "state.nonce" });
      const decoded = decodeOAuthState(packed);
      expect(decoded.redirectUri).toBe(OFFICIAL);
      expect(isAllowedOAuthRedirectUri(decoded.redirectUri)).toBe(true);
    });
  });

  it("rejeita callback malicioso fora da allowlist", () => {
    withOAuthEnv({ extras: EXTRAS }, () => {
      expect(isAllowedOAuthRedirectUri("https://evil.example/api/auth/google/callback")).toBe(false);
      expect(isAllowedOAuthRedirectUri("https://ojumidia.com.br.evil.com/api/auth/google/callback")).toBe(false);
    });
  });
});
