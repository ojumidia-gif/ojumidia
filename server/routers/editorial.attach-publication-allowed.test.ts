import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn());
vi.mock("../db", () => ({ getDb: getDbMock }));

import { editorialRouter } from "./editorial";

const chainFor = <T>(rows: T[]) => {
  const chain: { from: () => typeof chain; innerJoin: () => typeof chain; where: () => typeof chain; orderBy: () => typeof chain; limit: () => Promise<T[]>; then: (resolve: (value: T[]) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown> } = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: async () => rows,
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
};

function attachDb(media: Record<string, unknown>, publication: Record<string, unknown> = {}, extraSelects: unknown[][] = []) {
  const pub = { id: 1, contentKind: "História", status: "Rascunho", photoLimit: 5, videoLimit: 1, partnerId: null, createdBy: 1, ...publication };
  const select = vi.fn().mockReturnValueOnce(chainFor([pub]));
  for (const rows of extraSelects) select.mockReturnValueOnce(chainFor(rows));
  select.mockReturnValueOnce(chainFor([media]));
  select.mockReturnValueOnce(chainFor([]));
  select.mockReturnValueOnce(chainFor([]));
  return {
    select,
    update: vi.fn(),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 1 }]) }),
  };
}

const principal = { user: { id: 1, role: "administrador principal", openId: "admin", name: "Equipe", email: "equipe@oju.test", loginMethod: "test" } } as any;
const admin = { user: { id: 1, role: "administrador", openId: "admin", name: "Equipe", email: "equipe@oju.test", loginMethod: "test" } } as any;

describe("editorial.attachMedia e publicationAllowed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("CASO A: publicationAllowed false no servidor recusa o vínculo", async () => {
    const db = attachDb({ id: 2, mediaType: "foto", publicationAllowed: false, state: "Ativo", uploadStatus: "Aprovado", createdBy: 1, partnerId: null });
    getDbMock.mockResolvedValueOnce(db);
    await expect(editorialRouter.createCaller(principal).attachMedia({ publicationId: 1, mediaId: 2 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("CASO B: publicationAllowed true com demais guards permite o vínculo", async () => {
    const db = attachDb({ id: 2, mediaType: "foto", publicationAllowed: true, state: "Ativo", uploadStatus: "Aprovado", createdBy: 1, partnerId: null });
    getDbMock.mockResolvedValueOnce(db);
    await expect(editorialRouter.createCaller(principal).attachMedia({ publicationId: 1, mediaId: 2 })).resolves.toMatchObject({ success: true });
    expect(db.insert).toHaveBeenCalled();
  });

  it("CASO C: payload com publicationAllowed true não substitui o valor do servidor", async () => {
    const db = attachDb({ id: 2, mediaType: "foto", publicationAllowed: false, state: "Ativo", uploadStatus: "Aprovado", createdBy: 1, partnerId: null });
    getDbMock.mockResolvedValueOnce(db);
    await expect(editorialRouter.createCaller(principal).attachMedia({ publicationId: 1, mediaId: 2, publicationAllowed: true } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("CASO D: mídia de outro autor é recusada pelo guard de autoria", async () => {
    const db = attachDb(
      { id: 2, mediaType: "foto", publicationAllowed: true, state: "Ativo", uploadStatus: "Aprovado", createdBy: 99, partnerId: null },
      {},
      [[]],
    );
    getDbMock.mockResolvedValueOnce(db);
    await expect(editorialRouter.createCaller(admin).attachMedia({ publicationId: 1, mediaId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("attach lê publicationAllowed da linha do servidor, não do enum authorization", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers/editorial.ts"), "utf8");
    const attach = router.slice(router.indexOf("attachMedia:"), router.indexOf("detachMedia:"));
    expect(attach).toContain("!media[0].publicationAllowed");
    expect(attach).not.toContain("authorization !== \"Pendente\"");
    expect(attach).not.toContain("publicationAllowed:");
  });
});
