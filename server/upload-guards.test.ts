import { describe, expect, it } from "vitest";
import {
  classifyUploadFile,
  DEFAULT_STORAGE_QUOTA,
  isJpegBuffer,
  parseStorageQuotaPolicy,
  quotaDecision,
} from "./uploadGuards";
import { isUnsafeStorageKey } from "./mediaAccess";
import { parseEmailAllowlist } from "./_core/env";
import { MAX_MINICLIPS, MAX_PHOTOS } from "@shared/const";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
const pdf = Buffer.from("%PDF-1.4 mock");

describe("validação real de upload e quotas operacionais", () => {
  it("aceita JPEG verdadeiro e rejeita PNG/PDF disfarçados", () => {
    expect(isJpegBuffer(jpeg)).toBe(true);
    expect(classifyUploadFile("image/jpeg", jpeg)).toEqual({ kind: "foto" });
    expect(classifyUploadFile("image/jpeg", png)).toMatchObject({ error: expect.stringMatching(/disfarçado|JPEG/i) });
    expect(classifyUploadFile("image/png", jpeg)).toMatchObject({ error: expect.stringMatching(/somente JPEG/i) });
    expect(classifyUploadFile("application/pdf", pdf)).toEqual({ kind: "documento" });
    expect(classifyUploadFile("application/pdf", jpeg)).toMatchObject({ error: expect.any(String) });
    expect(classifyUploadFile("text/html", Buffer.from("<html>"))).toMatchObject({ error: expect.any(String) });
  });

  it("não usa 5 GB do Tigris como bloqueio de produto", () => {
    expect(DEFAULT_STORAGE_QUOTA.globalBlockBytes).toBeGreaterThan(5 * 1024 * 1024 * 1024);
    expect(quotaDecision(5 * 1024 * 1024 * 1024, DEFAULT_STORAGE_QUOTA.globalAlertBytes, DEFAULT_STORAGE_QUOTA.globalBlockBytes)).not.toBe("block");
    const parsed = parseStorageQuotaPolicy(JSON.stringify({ globalBlockBytes: 10 * 1024 * 1024 * 1024 }));
    expect(parsed.globalBlockBytes).toBe(10 * 1024 * 1024 * 1024);
    expect(MAX_PHOTOS).toBe(5);
    expect(MAX_MINICLIPS).toBe(1);
  });

  it("bloqueia path traversal no proxy e Super Admin vazio em produção", () => {
    expect(isUnsafeStorageKey("../secret")).toBe(true);
    expect(isUnsafeStorageKey("media/1/file.jpg")).toBe(false);
    expect(parseEmailAllowlist("equipe@ojumidia.com")).toEqual(new Set(["equipe@ojumidia.com"]));
    const empty = parseEmailAllowlist("");
    if (process.env.NODE_ENV === "production") expect(empty.size).toBe(0);
    else expect(empty.has("ojumidia@gmail.com")).toBe(true);
  });
});
