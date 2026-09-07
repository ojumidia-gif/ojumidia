import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canAttachWithinMediaLimit } from "./routers/editorial";

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

describe("controles obrigatórios da fase 0.5", () => {
  it("rejeita o sexto JPG e o segundo miniclipe no backend", () => {
    const base = { contentKind: "Cobertura", photoLimit: 5, videoLimit: 1 };
    expect(canAttachWithinMediaLimit({ ...base, mediaType: "foto", attachedPhotoCount: 0, attachedVideoCount: 0 })).toBe(true);
    expect(canAttachWithinMediaLimit({ ...base, mediaType: "foto", attachedPhotoCount: 4, attachedVideoCount: 0 })).toBe(true);
    expect(canAttachWithinMediaLimit({ ...base, mediaType: "foto", attachedPhotoCount: 5, attachedVideoCount: 0 })).toBe(false);
    expect(canAttachWithinMediaLimit({ ...base, mediaType: "vídeo", attachedPhotoCount: 0, attachedVideoCount: 0 })).toBe(true);
    expect(canAttachWithinMediaLimit({ ...base, mediaType: "vídeo", attachedPhotoCount: 0, attachedVideoCount: 1 })).toBe(false);
    expect(canAttachWithinMediaLimit({ ...base, mediaType: "vídeo", attachedPhotoCount: 0, attachedVideoCount: 2 })).toBe(false);
  });

  it("autentica upload, proxy, SSE, reativação e cron observável", () => {
    const runtime = read("server/_core/index.ts");
    const proxy = read("server/_core/storageProxy.ts");
    const media = read("server/routers/media.ts");
    const yaml = read("render.yaml");
    expect(runtime).toContain("classifyUploadFile");
    expect(runtime).toContain("enforceUploadBudget");
    expect(runtime).toContain("Faça login para enviar arquivos.");
    expect(runtime).toContain("sse_auth");
    expect(runtime).toContain("runProductionMaintenanceJobs");
    expect(proxy).toContain("authorizeStorageKeyAccess");
    expect(media).toContain("await assertMediaScope(db, ctx.user, current)");
    expect(media).toContain("inspectMediaObject");
    expect(media).toContain("setStorageQuota");
    expect(yaml).toContain("oju-midia-editorial-jobs");
    expect(yaml).toContain("render-editorial-trash-cron.mjs");
  });

  it("impede fallback inseguro de Super Admin em produção", () => {
    const env = read("server/_core/env.ts");
    expect(env).toContain('if (process.env.NODE_ENV === "production") return new Set()');
  });

  it("usa locking otimista em publicação e mídia para duas sessões simultâneas", () => {
    const editorial = read("server/routers/editorial.ts");
    const media = read("server/routers/media.ts");
    expect(editorial).toContain("eq(publications.version, expectedVersion)");
    expect(media).toContain("eq(mediaAssets.version, current.version)");
    expect(media).toContain("CONFLICT");
  });
});
