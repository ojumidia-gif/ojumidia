import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { adminNavGroups } from "./adminNav";
import { requiredLegalLinks } from "./legalDocuments";
import { portalContentDefaults } from "./portalContent";
import { siteDestinations } from "./siteDestinations";

function declaredAppPaths() {
  const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
  return [...app.matchAll(/path=\{\s*"([^"]+)"\s*\}/g)].map(match => match[1]);
}

function withoutParams(path: string) {
  return !path.includes(":");
}

describe("inventário de rotas, menus e destinos", () => {
  const paths = declaredAppPaths();

  it("declara as rotas públicas do menu, destinos, legais e CMS", () => {
    expect(paths).toContain("/termos-de-uso");
    expect(paths).toContain("/privacidade");
    for (const dest of siteDestinations) {
      expect(paths).toContain(dest.publicHref);
      expect(paths).toContain(dest.adminHref.split("?")[0]);
    }
    for (const item of portalContentDefaults.Global.navigation.items) {
      expect(paths).toContain(item.href);
    }
    for (const item of requiredLegalLinks) {
      expect(paths).toContain(item.href);
    }
    const policy = readFileSync(resolve(process.cwd(), "server/publicNavPolicy.ts"), "utf8");
    expect(policy).toContain('"/termos-de-uso"');
    expect(policy).toContain('"/privacidade"');
  });

  it("liga cada item do menu admin a uma rota existente", () => {
    const hrefs = adminNavGroups.flatMap(group => group.items.map(item => item.href));
    for (const href of hrefs) {
      expect(paths).toContain(href);
    }
    expect(paths).toContain("/admin/frentes");
    expect(paths).toContain("/admin/taxonomias");
  });

  it("não deixa rota estática de App.tsx órfã do Switch", () => {
    expect(paths.filter(withoutParams).length).toBeGreaterThan(40);
    expect(paths).toContain("/404");
  });
});
