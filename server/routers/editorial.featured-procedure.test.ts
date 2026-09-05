import { beforeEach, describe, expect, it, vi } from "vitest";
import { mediaAssets, publicationMedia, publications, taxonomies } from "../../drizzle/schema";

const getDbMock = vi.hoisted(() => vi.fn());
vi.mock("../db", () => ({ getDb: getDbMock }));

import { editorialRouter } from "./editorial";

const published = (id: number, contentKind: "História" | "Cobertura" | "Fotografia documental") => ({
  id, title: `${contentKind} ${id}`, slug: `conteudo-${id}`, contentKind, status: "Publicada", isPublic: true, commercialRequestId: null,
  manualFeatured: true, relevance: 10, sponsored: false, homePlacement: "Destaque principal" as const, homeOrder: id, publishedAt: new Date("2026-08-19"), createdAt: new Date("2026-08-18"),
});

function chainFor<T>(rows: T[]) {
  const chain: { where: () => typeof chain; orderBy: () => typeof chain; limit: () => Promise<T[]>; then: (resolve: (value: T[]) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown> } = {
    where: () => chain,
    orderBy: () => chain,
    limit: async () => rows,
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

function featuredDatabase() {
  const records = [published(1, "História"), published(2, "Fotografia documental"), published(3, "Cobertura")];
  return {
    select: vi.fn(() => ({
      from: (table: unknown) => {
        if (table === taxonomies) return chainFor([]);
        if (table === publications) return chainFor(records);
        if (table === publicationMedia) return chainFor([]);
        if (table === mediaAssets) return chainFor([]);
        return chainFor([]);
      },
    })),
  };
}

describe("procedure editorial.featured com coleções fotográficas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devolve um mix equilibrado de História, Cobertura e Fotografia documental", async () => {
    getDbMock.mockResolvedValueOnce(featuredDatabase());
    const result = await editorialRouter.createCaller({} as any).featured({});
    expect(result.map(item => item.contentKind)).toEqual(["História", "Fotografia documental", "Cobertura"]);
  });

  it("serializa a Fotografia como publicação de coleção, sem fotos individuais no destaque", async () => {
    getDbMock.mockResolvedValueOnce(featuredDatabase());
    const result = await editorialRouter.createCaller({} as any).featured({});
    const photography = result.find(item => item.contentKind === "Fotografia documental");
    expect(photography).toMatchObject({ title: "Fotografia documental 2", coverUrl: null, coverType: null });
    expect(photography).not.toHaveProperty("photos");
    expect(photography).not.toHaveProperty("media");
  });
});
