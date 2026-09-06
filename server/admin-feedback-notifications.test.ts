import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("feedback visual do Centro Administrativo", () => {
  it("configura notificações visíveis e dispensáveis", () => {
    const app = source("client/src/App.tsx");
    expect(app).toContain('position="top-right"');
    expect(app).toContain("richColors");
    expect(app).toContain("closeButton");
  });

  it("notifica criação, transições, retirada e falhas em conteúdos", () => {
    const publications = source("client/src/pages/admin/PublicationsAdmin.tsx");
    expect(publications).toContain("Aberto. Complete texto, território e capa.");
    expect(publications).toContain("No portal.");
    expect(publications).toContain("Arquivado.");
    expect(publications).toContain("Fora do ar.");
    expect(publications).toContain("Não foi possível criar.");
  });

  it("notifica salvamento e erro ao editar uma publicação", () => {
    const edit = source("client/src/pages/admin/PublicationEdit.tsx");
    expect(edit).toContain("Texto salvo.");
    expect(edit).toContain("Revisão publicada.");
    expect(edit).toContain("Não foi possível salvar as alterações.");
    expect(edit).toContain("Salvar e enviar para revisão");
  });
});
