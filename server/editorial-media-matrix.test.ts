import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
describe("matriz de mídia por frente editorial", () => { it("distingue vídeos de conteúdo e miniclipes do fundo vivo no Centro Administrativo", () => { const fronts = readFileSync(resolve(process.cwd(), "client/src/pages/admin/EditorialFrontsAdmin.tsx"), "utf8"); expect(fronts).toContain("um miniclipe é anexado como vídeo do Acervo"); expect(fronts).toContain("miniclipe de fundo vivo da Home é selecionado separadamente"); expect(fronts).toContain('href="/admin/miniclipes"'); }); });

