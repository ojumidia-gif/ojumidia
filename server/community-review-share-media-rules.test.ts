import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("revisão, descoberta e regras documentais", () => {
  const community = readFileSync(resolve(process.cwd(), "server/routers/community.ts"), "utf8");
  const map = readFileSync(resolve(process.cwd(), "client/src/pages/InstitutionExplorer.tsx"), "utf8");
  const memories = readFileSync(resolve(process.cwd(), "client/src/pages/OralMemorySearch.tsx"), "utf8");
  const review = readFileSync(resolve(process.cwd(), "client/src/pages/admin/MemoryReviewAdmin.tsx"), "utf8");
  const media = readFileSync(resolve(process.cwd(), "server/routers/media.ts"), "utf8");
  const policy = readFileSync(resolve(process.cwd(), "server/routers/editorial.ts"), "utf8");

  it("exige revisão humana com trilha auditável para textos assistidos", () => {
    expect(community).toContain("reviewMemoryAssistance");
    expect(community).toContain("aiReviewedAt");
    expect(review).toContain("Salvar revisão humana");
  });

  it("permite filtrar instituições públicas por tipo e território", () => {
    expect(map).toContain("typeFilter");
    expect(map).toContain("territoryFilter");
    expect(map).toContain("Limpar filtros");
  });

  it("compartilha somente a rota pública das memórias exibidas", () => {
    expect(memories).toContain("navigator.share");
    expect(memories).toContain("/memorias#memoria-");
    expect(memories).toContain("Copiar link");
  });

  it("aplica cinco fotos, dois vídeos curtos e uma sequência curta de miniclipes", () => {
    expect(policy).toContain("recordPhotoCap");
    expect(policy).toContain("recordVideoCap");
    expect(policy).toContain("MAX_MINICLIPS");
    expect(media).toContain("durationSeconds > HOME_MINICLIP_MAX_DURATION_SECONDS");
    expect(media).toContain("HOME_MINICLIP_SEQUENCE_LIMIT");
    expect(media).toContain("homeBackgroundConfig");
    expect(media).toContain("publicBackgroundClip");
    expect(media).toContain("recordHomeMiniclipSignal");
    expect(media).toContain("setBackgroundCaption");
  });
});
