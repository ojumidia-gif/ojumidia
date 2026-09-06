import { describe, expect, it } from "vitest";
import { parseEditorialBody } from "./editorialBody";

describe("corpo editorial com ritmo de leitura", () => {
  it("separa trecho, destaque e escapa HTML", () => {
    const blocks = parseEditorialBody("Abertura **autorizada**.\n\n## Casa e chão\n\n> O que a casa não autorizou permanece fora.\n\n<script>x</script>");
    expect(blocks[0]).toMatchObject({ type: "p" });
    expect(blocks[0].html).toContain("<strong>autorizada</strong>");
    expect(blocks[1]).toEqual({ type: "h2", html: "Casa e chão" });
    expect(blocks[2].type).toBe("quote");
    expect(blocks[3].html).toContain("&lt;script&gt;");
  });
});
