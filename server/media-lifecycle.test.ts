import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ABANDONED_UPLOAD_RETENTION_MS,
  confirmationMatchesMedia,
  formatMediaUsageBlock,
  GENERATED_ARTIFACT_INVENTORY,
  is403NotAbsence,
  MEDIA_PURGE_PIPELINE,
  ORPHAN_COMPLETED_UPLOAD_RETENTION_MS,
  uploadSessionCleanupClass,
} from "./mediaLifecycle";
import { classifyStorageError } from "./storage";

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

describe("ciclo de vida de mídia", () => {
  const mediaRouter = read("server/routers/media.ts");
  const lifecycle = read("server/mediaLifecycle.ts");
  const storage = read("server/storage.ts");
  const editorialTrash = read("server/editorialTrash.ts");
  const acervo = read("client/src/pages/admin/MediaAdmin.tsx");
  const lixeira = read("client/src/pages/admin/MediaTrashAdmin.tsx");
  const retencao = read("client/src/pages/admin/RetentionAdmin.tsx");
  const nav = read("client/src/lib/adminNav.ts");

  it("separa Acervo ativo e Lixeira no backend", () => {
    expect(mediaRouter).toContain("scopedMediaWhere(db, ctx.user, false)");
    expect(mediaRouter).toContain("scopedMediaWhere(db, ctx.user, true)");
    expect(mediaRouter).toContain("isNull(mediaAssets.deletedAt)");
    expect(mediaRouter).toContain("isNotNull(mediaAssets.deletedAt)");
    expect(mediaRouter).not.toMatch(/list:[\s\S]{0,400}return db\.select\(\)\.from\(mediaAssets\)\.orderBy/);
  });

  it("mantém o Acervo sem Restaurar de lixeira e a Lixeira com expurgo explícito", () => {
    expect(acervo).toContain("/admin/lixeira-midias");
    expect(acervo).not.toContain("restore.mutate");
    expect(lixeira).toContain("Excluir definitivamente");
    expect(lixeira).toContain("media.purge");
    expect(lixeira).toContain("Restaurar");
  });

  it("exige Super Admin para purge, restore, lixeira e retenção", () => {
    expect(mediaRouter).toContain("purge:");
    expect(mediaRouter).toContain("requireSuperAdmin(ctx.user.role)");
    expect(mediaRouter).toContain("cleanupAbandonedUploads");
    expect(nav).toContain("/admin/lixeira-midias");
    expect(nav).toContain("/admin/retencao");
    expect(nav).toContain("principalOnly: true");
  });

  it("recusa purge com vínculo e exige confirmação", () => {
    expect(lifecycle).toContain("collectMediaUsages");
    expect(lifecycle).toContain("publicationMedia");
    expect(lifecycle).toContain("taxonomyMedia");
    expect(lifecycle).toContain("logoMediaId");
    expect(lifecycle).toContain("profileMediaId");
    expect(lifecycle).toContain("primaryMediaId");
    expect(lifecycle).toContain("coverMediaId");
    expect(lifecycle).toContain("videoMediaId");
    expect(lifecycle).toContain("commercialMiniclips");
    expect(lifecycle).toContain("revenueLeads");
    expect(lifecycle).toContain("networkProductionMedia");
    expect(lifecycle).toContain("networkProductions");
    expect(confirmationMatchesMedia({ id: 12, filename: "IMG_0402-074.jpg" }, "IMG_0402-074.jpg")).toBe(true);
    expect(confirmationMatchesMedia({ id: 12, filename: "IMG_0402-074.jpg" }, "outra")).toBe(false);
    expect(formatMediaUsageBlock([{ kind: "publicationMedia", id: 9, label: "Publicação “Teste”" }])).toContain("publicationMedia");
  });

  it("expurga na ordem audit → storage confirmado → metadado → sessão, e não trata 403 como 404", () => {
    expect(MEDIA_PURGE_PIPELINE).toEqual([
      "require-trash",
      "require-no-usages",
      "audit-attempt",
      "delete-storage-confirmed",
      "delete-mediaAssets",
      "delete-unused-uploadSession",
      "audit-success",
    ]);
    expect(classifyStorageError({ $metadata: { httpStatusCode: 403 }, name: "Forbidden" }).status).toBe("forbidden");
    expect(classifyStorageError({ $metadata: { httpStatusCode: 404 }, name: "NotFound", Code: "NoSuchKey" }).status).toBe("absent");
    expect(classifyStorageError({ name: "SignatureDoesNotMatch", $metadata: { httpStatusCode: 403 } }).status).toBe("forbidden");
    expect(is403NotAbsence({ status: "forbidden", message: "x" })).toBe(true);
    expect(is403NotAbsence({ status: "absent" })).toBe(false);
    expect(storage).toContain("HeadObjectCommand");
    expect(storage).toContain("403 não prova");
    expect(lifecycle).toContain("media-purge-failed");
    expect(lifecycle).toContain("media-permanently-purged");
    expect(lifecycle).toContain("Envie a mídia à Lixeira de mídia antes da exclusão definitiva");
  });

  it("bloqueia restore depois do purge e quando o objeto não é recuperável", () => {
    expect(mediaRouter).toContain("Depois de um expurgo definitivo não existe restauração");
    expect(lifecycle).toContain("Restaurar é impossível");
    expect(lifecycle).toContain("403 não significa que o arquivo sumiu");
  });

  it("não deixa o expurgo editorial destruir mídia no lugar de media.purge", () => {
    expect(editorialTrash).not.toContain("storageDelete");
    expect(editorialTrash).toContain("media.purge");
    expect(editorialTrash).toContain("delete(publicationMedia)");
  });

  it("classifica sessões abandonadas sem criar lixeira da lixeira", () => {
    const now = new Date("2026-09-05T12:00:00Z");
    const old = new Date(now.getTime() - ABANDONED_UPLOAD_RETENTION_MS - 1);
    const recent = new Date(now.getTime() - 1000);
    expect(uploadSessionCleanupClass({ status: "Falhou", createdAt: old, completedAt: null }, now, false)).toBe("abandoned-incomplete");
    expect(uploadSessionCleanupClass({ status: "Falhou", createdAt: recent, completedAt: null }, now, false)).toBe("retain");
    expect(uploadSessionCleanupClass({ status: "Aprovado", createdAt: old, completedAt: old }, now, true)).toBe("linked");
    const week = new Date(now.getTime() - ORPHAN_COMPLETED_UPLOAD_RETENTION_MS - 1);
    expect(uploadSessionCleanupClass({ status: "Aprovado", createdAt: week, completedAt: week }, now, false)).toBe("abandoned-completed");
    expect(retencao).toContain("não substitui a Lixeira");
    expect(retencao).toContain("technicalUploads");
    expect(lifecycle).toContain("listUnlinkedUploadSessions");
    expect(mediaRouter).toContain("force: z.boolean()");
    expect(GENERATED_ARTIFACT_INVENTORY.some(item => item.kind.includes("Auditoria"))).toBe(true);
    expect(GENERATED_ARTIFACT_INVENTORY.every(item => item.kind.includes("Auditoria") ? item.accumulatesInTigris === false : true)).toBe(true);
  });

  it("preserva auditEvents e não inventa exportação de auditoria no Tigris", () => {
    expect(mediaRouter).toContain("auditEventsAreNotTrash");
    expect(GENERATED_ARTIFACT_INVENTORY.find(item => item.kind === "Auditoria administrativa")?.accumulatesInTigris).toBe(false);
    expect(retencao).toContain("A Auditoria não se apaga");
  });
});
