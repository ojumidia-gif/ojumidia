import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EDITORIAL_TRASH_RETENTION_MS, editorialTrashDeadline, isEditorialTrashExpired } from "./editorialTrash";

describe("Lixeira Editorial", () => {
  it("mantém a janela exata de restauração por 24 horas", () => {
    const deletedAt = new Date("2026-08-21T12:00:00.000Z");
    expect(editorialTrashDeadline(deletedAt).getTime()).toBe(deletedAt.getTime() + EDITORIAL_TRASH_RETENTION_MS);
    expect(isEditorialTrashExpired(deletedAt, new Date("2026-08-22T11:59:59.999Z"))).toBe(false);
  });

  it("considera expirado no instante do prazo e depois dele", () => {
    const deletedAt = new Date("2026-08-21T12:00:00.000Z");
    expect(isEditorialTrashExpired(deletedAt, new Date("2026-08-22T12:00:00.000Z"))).toBe(true);
    expect(isEditorialTrashExpired(deletedAt, new Date("2026-08-22T12:01:00.000Z"))).toBe(true);
  });

  it("confirma o título sem exigir acento idêntico e remove vínculos antes do registro", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers/editorial.ts"), "utf8");
    const trash = readFileSync(resolve(process.cwd(), "server/editorialTrash.ts"), "utf8");
    const panel = readFileSync(resolve(process.cwd(), "client/src/pages/admin/EditorialTrashAdmin.tsx"), "utf8");
    expect(router).toContain("confirmPhrasesMatch");
    expect(panel).toContain("confirmPhrasesMatch");
    expect(trash).toContain("delete(editorialActivities)");
    expect(trash).toContain("publicationId: null");
  });
});
