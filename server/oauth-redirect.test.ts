import { describe, expect, it } from "vitest";
import {
  GOOGLE_OAUTH_CALLBACK_PATH,
  allowedOAuthRedirectUris,
  oauthStartBounceUrl,
  requestOAuthCallbackUri,
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

describe("OAuth redirect após domínio próprio", () => {
  it("aceita o domínio Ojú e o www como callbacks autorizados", () => {
    const uris = allowedOAuthRedirectUris({
      googleOAuthRedirectUri: "https://ojumidia.onrender.com/api/auth/google/callback",
      publicBaseUrl: "https://ojumidia.com.br",
    });
    expect(uris.has(`https://ojumidia.com.br${GOOGLE_OAUTH_CALLBACK_PATH}`)).toBe(true);
    expect(uris.has(`https://www.ojumidia.com.br${GOOGLE_OAUTH_CALLBACK_PATH}`)).toBe(true);
    expect(uris.has(`https://ojumidia.onrender.com${GOOGLE_OAUTH_CALLBACK_PATH}`)).toBe(true);
  });

  it("quando o login começa no www, usa o callback canônico do apex se ele estiver no ENV", () => {
    const previous = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://ojumidia.com.br/api/auth/google/callback";
    try {
      const req = fakeReq("www.ojumidia.com.br");
      expect(requestOAuthCallbackUri(req)).toBe("https://www.ojumidia.com.br/api/auth/google/callback");
      expect(resolveOAuthRedirectUri(req)).toBe("https://ojumidia.com.br/api/auth/google/callback");
      expect(oauthStartBounceUrl(req, resolveOAuthRedirectUri(req))).toBe("https://ojumidia.com.br/api/auth/google/start");
    } finally {
      process.env.GOOGLE_OAUTH_REDIRECT_URI = previous;
    }
  });
});
