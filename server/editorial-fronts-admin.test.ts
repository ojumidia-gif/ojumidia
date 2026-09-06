import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("frentes editoriais administrativas", () => {
  it("oferece entradas explícitas para História, Cobertura, Documentário, Projeto, Fotografia, Territórios e Acervo", () => {
    const fronts = readFileSync(resolve(process.cwd(), "client/src/pages/admin/EditorialFrontsAdmin.tsx"), "utf8");
    const publications = readFileSync(resolve(process.cwd(), "client/src/pages/admin/PublicationsAdmin.tsx"), "utf8");
    ["Histórias", "Coberturas", "Documentários", "Projetos", "Fotografia documental", "Territórios", "Acervo e miniclipes"].forEach(label => expect(fronts).toContain(label));
    expect(publications).toContain('search.get("tipo")');
  });
});

