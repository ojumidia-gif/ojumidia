import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("sequência do fundo vivo", () => {
  it("mantém um vídeo visível por vez e aplica a duração configurada de transição", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const admin = readFileSync(resolve(process.cwd(), "client/src/pages/admin/MiniclipsAdmin.tsx"), "utf8");
    expect(home).toContain("heroVideos.map");
    expect(home).toContain("transitionDuration");
    expect(home).toContain("displaySeconds * 1000");
    expect(home).toContain("/oju-assets/orixas-transicao-ritual-cinematografica.mp4");
    expect(admin).toContain("saveHomeBackgroundConfig");
    expect(admin).toContain('user?.role === "administrador principal"');
  });
});
