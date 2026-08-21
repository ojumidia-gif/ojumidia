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
});
