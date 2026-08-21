import { describe, expect, it } from "vitest";
import { balanceFeaturedPublications } from "./editorial";

describe("equilíbrio dos destaques editoriais", () => {
  it("prioriza uma coleção fotográfica, uma História e uma Cobertura antes de repetir formatos", () => {
    const selected = balanceFeaturedPublications([
      { id: 1, contentKind: "História" },
      { id: 2, contentKind: "História" },
      { id: 3, contentKind: "Fotografia documental" },
      { id: 4, contentKind: "Cobertura" },
      { id: 5, contentKind: "Fotografia documental" },
    ]);
    expect(selected.slice(0, 3).map(item => item.contentKind)).toEqual(["História", "Fotografia documental", "Cobertura"]);
    expect(selected.map(item => item.id)).toEqual([1, 3, 4, 2, 5]);
  });

  it("mantém o limite da seleção, sem permitir que um formato domine os destaques", () => {
    const selected = balanceFeaturedPublications(Array.from({ length: 10 }, (_, index) => ({ id: index + 1, contentKind: "Fotografia documental" })), 6);
    expect(selected).toHaveLength(6);
  });
});
