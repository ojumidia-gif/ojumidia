import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("completude da Home cinematográfica", () => {
  it("preserva a vitrine de divulgação contratada e conecta controles a comportamentos reais", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const header = readFileSync(resolve(process.cwd(), "client/src/components/PublicHeader.tsx"), "utf8");
    expect(home).toContain("trpc.commercial.activeAds.useQuery");
    expect(home).toContain("Divulgação contratada");
    expect(home).toContain("onClick={playHero}");
    expect(home).toContain("onClick={toggleMute}");
    expect(header).toContain("setOpen(value => !value)");
    expect(header).toContain("onMenuClick?.()");
  });
});
