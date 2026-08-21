import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("hero cinematográfico da Home", () => {
  it("usa a sequência elegível como fundo vivo e não depende de imagem fixa", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    expect(source).toContain("heroVideos.map");
    expect(source).toContain("homeBackgroundConfig");
    expect(source).toContain("Ative um miniclipe autorizado");
    expect(source).not.toContain("HomeGalleryLayoutPreview");
  });
});
