import { describe, expect, it } from "vitest";
import { makeDeskErrorCode, matchOjuBotFaqs } from "./ojuBotFaqs";

describe("Ojú Bot", () => {
  it("encontra respostas prontas por palavra, mesmo com acento", () => {
    const home = matchOjuBotFaqs("home");
    expect(home.some(item => item.id === "home")).toBe(true);
    const lixeira = matchOjuBotFaqs("lixeira excluir");
    expect(lixeira.some(item => item.id === "lixeira")).toBe(true);
    expect(matchOjuBotFaqs("outro parceiro").some(item => item.id === "carteira")).toBe(true);
    expect(matchOjuBotFaqs("lgpd").some(item => item.id === "lgpd")).toBe(true);
    expect(matchOjuBotFaqs("parceiro candidatura").some(item => item.id === "parceiro")).toBe(true);
  });

  it("não inventa resposta quando a busca não casa", () => {
    expect(matchOjuBotFaqs("xyzzy-nao-existe-faq")).toEqual([]);
  });

  it("gera código de ticket para o Canal Ojú", () => {
    expect(makeDeskErrorCode()).toMatch(/^OJU-[A-Z0-9]+$/);
  });
});
