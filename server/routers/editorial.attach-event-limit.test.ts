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

function databaseForEventBoundLimit(mediaType: "foto" | "vídeo") {
  const publication = { id: 1, contentKind: "Cobertura", status: "Rascunho", photoLimit: 1, videoLimit: 1, partnerId: null, createdBy: 1 };
  const incoming = { id: 2, mediaType, publicationAllowed: true, state: "Ativo", uploadStatus: "Aprovado", createdBy: 1 };
  const total = mediaType === "foto" ? 5 : 2;
  const alreadyAttached = Array.from({ length: total }, (_, index) => ({ id: index + 3, mediaType, publicationAllowed: true, state: "Ativo" }));
  return {
    select: vi.fn()
      .mockReturnValueOnce(chainFor([publication]))
      .mockReturnValueOnce(chainFor([]))
      .mockReturnValueOnce(chainFor([incoming]))
      .mockReturnValueOnce(chainFor(alreadyAttached.map(item => ({ publicationId: 1, mediaId: item.id }))))
      .mockReturnValueOnce(chainFor(alreadyAttached))
      .mockReturnValueOnce(chainFor([{ publicationId: 1, taxonomyId: 9 }]))
      .mockReturnValueOnce(chainFor([{ id: 9, dimension: "Evento", name: "Celebração" }])),
    update: vi.fn(),
    insert: vi.fn(),
  };
}

const context = { user: { id: 1, role: "administrador", openId: "admin", name: "Equipe", email: "equipe@oju.test", loginMethod: "test" } } as any;

describe("attachMedia com vínculo de Evento", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["foto", "vídeo"] as const)("mantém o limite de %s em Cobertura vinculada a Evento", async mediaType => {
    const db = databaseForEventBoundLimit(mediaType);
    getDbMock.mockResolvedValueOnce(db);
    await expect(editorialRouter.createCaller(context).attachMedia({ publicationId: 1, mediaId: 2 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.insert).not.toHaveBeenCalled();
  });
});
