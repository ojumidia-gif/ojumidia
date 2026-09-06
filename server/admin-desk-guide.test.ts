import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("guia e Canal Ojú", () => {
  it("expõe fluxos guiados por destino público e o canal do Super Admin", () => {
    const dest = readFileSync(resolve(process.cwd(), "client/src/lib/siteDestinations.ts"), "utf8");
    const nav = readFileSync(resolve(process.cwd(), "client/src/lib/adminNav.ts"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const desk = readFileSync(resolve(process.cwd(), "server/routers/desk.ts"), "utf8");
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const operations = readFileSync(resolve(process.cwd(), "server/routers/operations.ts"), "utf8");
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    const shared = readFileSync(resolve(process.cwd(), "client/src/pages/admin/_shared.tsx"), "utf8");
    const bot = readFileSync(resolve(process.cwd(), "client/src/components/OjuBot.tsx"), "utf8");
    const guide = readFileSync(resolve(process.cwd(), "client/src/lib/adminGuide.ts"), "utf8");
    expect(dest).toContain("steps:");
    expect(nav).toContain('href: "/admin/guia"');
    expect(nav).toContain('href: "/admin/canal"');
    expect(app).toContain('path={"/admin/guia"}');
    expect(app).toContain('path={"/admin/canal"}');
    expect(desk).toContain("desk-message-sent");
    expect(desk).toContain("Somente o Super Admin lê e responde o Canal Ojú.");
    expect(schema).toContain('mysqlTable("adminDeskMessages"');
    expect(operations).toContain("Canal Ojú");
    expect(layout).toContain("<OjuBot />");
    expect(shared).toContain("Não exibir mais");
    expect(guide).toContain('FIRST_GUIDE_STORAGE_KEY = "oju-hide-first-guide"');
    expect(bot).toContain("Não achei. Enviar ao Canal Ojú");
    expect(bot).toContain("Código:");
    expect(bot).toContain('user?.role === "administrador principal"');
    const canal = readFileSync(resolve(process.cwd(), "client/src/pages/admin/CanalOjuAdmin.tsx"), "utf8");
    expect(canal).toContain("Ojú Bot é só para admin comum");
  });
});
