import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("configuração incremental do Firebase", () => {
  it("mantém uma inicialização única, opcional e sem credenciais administrativas", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/lib/firebase.ts"), "utf8");
    expect(source).toContain('from "firebase/app"');
    expect(source).toContain("getApps().length ? getApp() : initializeApp");
    expect(source).toContain("firebaseConfigured");
    expect(source).not.toContain("private_key");
  });

  it("valida a chave Web do Firebase por uma chamada inofensiva de configuração", async () => {
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) {
      expect(readFileSync(resolve(process.cwd(), "ENVIRONMENT_TEMPLATE.md"), "utf8")).toContain("VITE_FIREBASE_API_KEY=");
      return;
    }
    expect(apiKey).toMatch(/^AIza[\w-]{20,}$/);
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${apiKey}`);
    const body = await response.text();
    expect(body).not.toMatch(/API key not valid|API_KEY_INVALID|INVALID_API_KEY/i);
  }, 15_000);
});
