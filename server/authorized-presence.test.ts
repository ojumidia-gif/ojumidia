import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { instagramHandleLabel, instagramProfileUrl, normalizeInstagramHandle } from "@shared/instagramHandle";

describe("presença autorizada de Instagram", () => {
  it("normaliza handle e recusa URL ou lixo", () => {
    expect(normalizeInstagramHandle("@Casa.Oju")).toBe("casa.oju");
    expect(normalizeInstagramHandle("https://instagram.com/casa.oju/")).toBe("casa.oju");
    expect(normalizeInstagramHandle("")).toBeNull();
    expect(normalizeInstagramHandle("https://evil.example/x")).toBeNull();
    expect(instagramHandleLabel("casa.oju")).toBe("@casa.oju");
    expect(instagramProfileUrl("casa.oju")).toBe("https://instagram.com/casa.oju");
  });

  it("expõe o @ no crédito e no diretório, nunca na Home", () => {
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const partners = readFileSync(resolve(process.cwd(), "server/routers/partners.ts"), "utf8");
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const story = readFileSync(resolve(process.cwd(), "client/src/pages/Story.tsx"), "utf8");
    const directory = readFileSync(resolve(process.cwd(), "client/src/pages/InstitutionExplorer.tsx"), "utf8");
    const dashboard = readFileSync(resolve(process.cwd(), "client/src/pages/admin/AdminDashboard.tsx"), "utf8");
    expect(schema).toContain("instagramHandle");
    expect(partners).toContain("setMyInstagramHandle");
    expect(home).not.toContain("AuthorizedInstagram");
    expect(story).toContain("AuthorizedInstagram");
    expect(directory).toContain("AuthorizedInstagram");
    expect(directory).toContain("inhabitedTerritories");
    expect(dashboard).toContain("setMyInstagramHandle");
  });
});
