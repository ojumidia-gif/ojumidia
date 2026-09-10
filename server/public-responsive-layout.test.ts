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
    expect(css).toContain("justify-content: center");
    expect(css).not.toContain("justify-content: flex-end");
    expect(footer).toContain("public-footer-nav");
    expect(footer).toContain("flex-col items-center");
    expect(footer).toContain("© 2026 Ojú Mídia · Todos os direitos reservados");
    expect(css).toContain(".public-footer-copyright");
    expect(css).toContain("text-transform: none");
  });
});
