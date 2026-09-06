import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("discrição do Centro Administrativo", () => {
  it("não promove visualmente o acesso administrativo no portal público", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    expect(css).toContain('a[href="/admin"] { display: none !important; }');
    expect(css).toContain(".hero-admin-hint { display: none; }");
    expect(home).not.toContain('href="/admin"');
  });
});

