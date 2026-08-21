import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("substituição da prévia técnica da Home", () => {
  it("remove a grade temporária da Home ao ativar a composição cinematográfica", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const preview = readFileSync(resolve(process.cwd(), "client/src/components/HomeGalleryLayoutPreview.tsx"), "utf8");
    expect(home).not.toContain("<HomeGalleryLayoutPreview />");
    expect(preview).toContain("Prévia técnica temporária");
    expect(home).toContain("featured.title");
  });
});
