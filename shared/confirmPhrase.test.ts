import { describe, expect, it } from "vitest";
import { confirmPhrasesMatch, normalizeConfirmPhrase } from "./confirmPhrase";

describe("confirmação de exclusão definitiva", () => {
  it("ignora maiúsculas, acentos e espaços extras", () => {
    expect(normalizeConfirmPhrase("  Olhar Ojú  ")).toBe("olhar oju");
    expect(confirmPhrasesMatch("Olhar Ojú", "olhar oju")).toBe(true);
    expect(confirmPhrasesMatch("olhar oju", "olhar oju")).toBe(true);
    expect(confirmPhrasesMatch("Olhar Ojú", "outro título")).toBe(false);
  });
});
