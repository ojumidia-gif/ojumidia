import { describe, expect, it } from "vitest";
import { photoDocumentaryInput } from "./editorial";

describe("catálogo de Fotografia documental", () => {
  it("usa uma página inicial moderada para evitar carregar todo o acervo de uma vez", () => {
    expect(photoDocumentaryInput.parse({})).toEqual({ limit: 8, offset: 0 });
  });

  it("aceita paginação controlada para carregar mais coleções sem exceder o tamanho visual da página", () => {
    expect(photoDocumentaryInput.parse({ limit: 24, offset: 16 })).toEqual({ limit: 24, offset: 16 });
    expect(() => photoDocumentaryInput.parse({ limit: 25, offset: 0 })).toThrow();
  });
});
