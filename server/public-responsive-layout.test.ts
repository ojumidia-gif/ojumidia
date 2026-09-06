import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("layout público responsivo", () => {
  it("adapta o portal à largura da tela sem travar zoom nem o rodapé", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    const footer = readFileSync(resolve(process.cwd(), "client/src/components/PublicFooter.tsx"), "utf8");
    expect(html).toContain("width=device-width");
    expect(html).toContain("viewport-fit=cover");
    expect(html).not.toContain("maximum-scale=1");
    expect(css).toContain(".public-footer-nav");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain("grid-template-columns: 1fr");
    expect(footer).toContain('className="public-footer-nav"');
  });
});
