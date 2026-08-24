import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("login Google OAuth do Super Admin", () => {
  const oauth = readFileSync(resolve(process.cwd(), "server/_core/oauth.ts"), "utf8");
  const env = readFileSync(resolve(process.cwd(), "server/_core/env.ts"), "utf8");
  const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
  const clientLogin = readFileSync(resolve(process.cwd(), "client/src/const.ts"), "utf8");

  it("registra início e callback próprios no servidor", () => {
    expect(oauth).toContain('app.get("/api/auth/google/start"');
    expect(oauth).toContain('app.get("/api/auth/google/callback"');
    expect(oauth).not.toContain("/api/oauth/callback");
    expect(oauth).not.toContain("exchangeCodeForToken");
  });

  it("não expõe o segredo Google nem monta a URL no navegador", () => {
    expect(clientLogin).toContain('window.location.href = "/api/auth/google/start"');
    expect(clientLogin).not.toContain("VITE_APP_ID");
    expect(clientLogin).not.toContain("VITE_OAUTH_PORTAL_URL");
    expect(clientLogin).not.toContain("GOOGLE_CLIENT_SECRET");
  });

  it("promove Super Admin por e-mail e sub Google", () => {
    expect(env).toContain("ojumidia@gmail.com");
    expect(env).toContain("aquinopratesr@gmail.com");
    expect(db).toContain("isAuthorizedSuperAdmin");
    expect(db).not.toContain("ownerOpenId");
    expect(db).not.toContain("OWNER_OPEN_ID");
  });
});
