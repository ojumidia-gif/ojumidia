import { describe, expect, it } from "vitest";
import {
  allowedOAuthRedirectUris,
  oauthStartBounceUrl,
  resolveOAuthRedirectUri,
} from "./_core/oauthRedirect";

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
    try {
      const req = fakeReq("www.ojumidia.com.br");
      expect(resolveOAuthRedirectUri(req)).toBe("https://ojumidia.com.br/api/auth/google/callback");
      expect(oauthStartBounceUrl(req, resolveOAuthRedirectUri(req))).toBe("https://ojumidia.com.br/api/auth/google/start");
    } finally {
      process.env.GOOGLE_OAUTH_REDIRECT_URI = previous;
    }
  });
});
