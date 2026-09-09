import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { UNAUTHED_ERR_MSG } from "@shared/const";

const getDbMock = vi.hoisted(() => vi.fn());
vi.mock("../db", () => ({ getDb: getDbMock }));

import { operationsRouter } from "./operations";

const rows = [{ id: 1, action: "login-success", actorId: 1 }];

function selectDb() {
  const offset = vi.fn(async () => rows);
  const limit = vi.fn(() => ({ offset }));
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where, orderBy }));
  const select = vi.fn(() => ({ from }));
  return {
    db: { select, insert: vi.fn(), update: vi.fn(), delete: vi.fn(), execute: vi.fn() },
    select,
  };
}

function caller(user: {
  id: number;
  role: string;
  adminAccess?: boolean;
  accountStatus?: string;
} | null) {
  return operationsRouter.createCaller({
    user: user
      ? {
          id: user.id,
          openId: String(user.id),
          name: "Equipe",
          email: "equipe@oju.test",
          loginMethod: "google",
          role: user.role,
          adminAccess: user.adminAccess ?? true,
          accountStatus: user.accountStatus ?? "Ativo",
          sessionEpoch: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: {} as never,
    res: {} as never,
  } as never);
}

describe("operations.auditLog — contrato de autorização", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserva o gate de Super Admin com TRPCError FORBIDDEN, no padrão requirePrincipal", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers/operations.ts"), "utf8");
    expect(source).toContain('function requirePrincipal(role: string)');
    expect(source).toContain('code: "FORBIDDEN"');
    expect(source).toContain("Somente o Super Admin consulta o registro administrativo.");
    expect(source).toContain("requirePrincipal(ctx.user.role)");
    expect(source).not.toContain('throw new Error("Somente o Super Admin consulta o registro administrativo.")');
  });

  it("permite consulta ao Super Admin e não executa INSERT/UPDATE/DELETE", async () => {
    const mock = selectDb();
    getDbMock.mockResolvedValue(mock.db);
    const result = await caller({ id: 1, role: "administrador principal" }).auditLog({ limit: 5, offset: 0, view: "operacao" });
    expect(result).toEqual(rows);
    expect(mock.db.select).toHaveBeenCalled();
    expect(mock.db.insert).not.toHaveBeenCalled();
    expect(mock.db.update).not.toHaveBeenCalled();
    expect(mock.db.delete).not.toHaveBeenCalled();
  });

  it("recusa administrador autenticado que não é Super Admin com FORBIDDEN, sem tocar no banco", async () => {
    await expect(caller({ id: 10, role: "administrador" }).auditLog()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("recusa administrador territorial autenticado com FORBIDDEN", async () => {
    await expect(caller({ id: 11, role: "administrador" }).auditLog()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Somente o Super Admin consulta o registro administrativo.",
    });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("recusa profissional autenticado sem adminAccess com UNAUTHORIZED do protectedProcedure", async () => {
    await expect(caller({ id: 9, role: "criador", adminAccess: false }).auditLog()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
    });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("recusa papel profissional com adminAccess mas sem Super Admin com FORBIDDEN", async () => {
    await expect(caller({ id: 12, role: "criador", adminAccess: true }).auditLog()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("recusa anônimo com UNAUTHORIZED do protectedProcedure", async () => {
    await expect(caller(null).auditLog()).rejects.toMatchObject({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    expect(getDbMock).not.toHaveBeenCalled();
  });
});
