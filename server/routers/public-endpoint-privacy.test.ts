import { beforeEach, describe, expect, it, vi } from "vitest";
import { advertisements, commercialEditorialAuthorizations, mediaAssets, publicationMedia, publicationTaxonomies, publications, taxonomies } from "../../drizzle/schema";

const getDbMock = vi.hoisted(() => vi.fn());
vi.mock("../db", () => ({ getDb: getDbMock }));

import { commercialRouter } from "./commercial";
import { editorialRouter } from "./editorial";

const publication = {
  id: 7,
  title: "Cobertura autorizada",
  contentKind: "Cobertura",
  slug: "cobertura-autorizada",
  subtitle: null,
  summary: "Registro documental",
  body: "Texto editorial",
  status: "Publicada",
  teamId: null,
  createdBy: 1,
  editedBy: null,
  approvedBy: 2,
  createdAt: new Date("2026-08-01"),
  updatedAt: new Date("2026-08-02"),
  publishedAt: new Date("2026-08-03"),
  isPublic: true,
  unpublishedAt: null,
  unpublishedBy: null,
  coverageStart: null,
  coverageEnd: null,
  relevance: 50,
  manualFeatured: true,
  sponsored: true,
  sponsorDisclosure: "Divulgação identificada",
  commercialRequestId: 44,
  photoLimit: null,
  videoLimit: null,
  homePlacement: "Destaque principal",
  homeOrder: 0,
  version: 1,
} as const;

const authorization = { id: 44, requestId: 44, status: "Autorizada", allowPhotos: true, allowVideos: false, allowOrganizationName: false, allowLocation: false, allowStory: true, allowPeopleIdentification: false, allowPortal: true, allowInstitutional: false, allowSocial: false, authorizedAt: new Date("2026-08-04"), expiresAt: null, revokedAt: null } as const;
const advertisement = {
  id: 8,
  advertiserName: "Parceiro",
  title: "Cartão de serviço",
  description: "Informação pública",
  contact: "5511999999999",
  services: "Serviço documental",
  format: "Cartão de serviço",
  mediaUrl: null,
  mediaType: null,
  startsAt: new Date("2026-08-01"),
  endsAt: new Date("2026-09-01"),
  renewalAt: null,
  status: "Ativo",
  sourcePublicationId: 7,
  capturedByUserId: 3,
  contractedAmount: "2500.00",
  ojuSharePercent: "60.00",
  captorSharePercent: "40.00",
  payoutStatus: "Pendente",
  createdBy: 3,
  createdAt: new Date("2026-08-01"),
  updatedAt: new Date("2026-08-02"),
} as const;

function createPublicDb({ publicationRows = [publication], advertisementRows = [advertisement] }: { publicationRows?: readonly typeof publication[]; advertisementRows?: readonly typeof advertisement[] } = {}) {
  const sources = new Map<unknown, readonly Record<string, unknown>[]>([
    [publications, publicationRows],
    [commercialEditorialAuthorizations, [authorization]],
    [advertisements, advertisementRows],
    [taxonomies, []],
    [publicationMedia, []],
    [publicationTaxonomies, []],
    [mediaAssets, []],
  ]);
  const project = (rows: readonly Record<string, unknown>[], shape?: Record<string, unknown>) => shape ? rows.map(row => Object.fromEntries(Object.keys(shape).map(key => [key, row[key]]))) : rows;
  return {
    select: vi.fn((shape?: Record<string, unknown>) => ({
      from: (table: unknown) => {
        const result = project(sources.get(table) || [], shape);
        const chain: { where: () => typeof chain; orderBy: () => typeof chain; limit: () => Promise<readonly Record<string, unknown>[]>; then: (resolve: (value: readonly Record<string, unknown>[]) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown> } = {
          where: () => chain,
          orderBy: () => chain,
          limit: async () => result,
          then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
        };
        return chain;
      },
    })),
  };
}

function expectNoCommercialPrivateData(payload: unknown) {
  const serialized = JSON.stringify(payload);
  [
    "commercialRequestId",
    "requestId",
    "proposalSummary",
    "proposalAmount",
    "proposalSentAt",
    "acceptedAt",
    "productionStartedAt",
    "deliveredAt",
    "deliveryDetails",
    "deliveryUrl",
    "editorialAuthorizedAt",
    "notes",
    "documentUrl",
    "storageKey",
    "contractor",
    "contractedAmount",
    "ojuSharePercent",
    "captorSharePercent",
    "payoutStatus",
    "managedByUserId",
    "capturedByUserId",
    "createdBy",
  ].forEach(field => expect(serialized).not.toContain(`\"${field}\"`));
}

describe("isolamento dos endpoints públicos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serializa search, featured, bySlug e photoDocumentary sem vínculo ou dados privados", async () => {
    getDbMock.mockResolvedValueOnce(createPublicDb());
    const search = await editorialRouter.createCaller({} as any).search({});
    expectNoCommercialPrivateData(search);

    getDbMock.mockResolvedValueOnce(createPublicDb());
    const featured = await editorialRouter.createCaller({} as any).featured({});
    expectNoCommercialPrivateData(featured);

    getDbMock.mockResolvedValueOnce(createPublicDb({ publicationRows: [{ ...publication, contentKind: "Fotografia documental" }] }));
    const documentary = await editorialRouter.createCaller({} as any).photoDocumentary({});
    expectNoCommercialPrivateData(documentary);

    getDbMock.mockResolvedValueOnce(createPublicDb());
    const story = await editorialRouter.createCaller({} as any).bySlug({ slug: publication.slug });
    expectNoCommercialPrivateData(story);
    expect(story?.editorialAuthorization).toMatchObject({ authorized: true });
  });

  it("serializa activeAds com informações de divulgação, sem valores, comissão ou pagamento", async () => {
    getDbMock.mockResolvedValueOnce(createPublicDb());
    const activeAds = await commercialRouter.createCaller({} as any).activeAds();
    expect(activeAds[0]).toMatchObject({ title: advertisement.title, contact: advertisement.contact });
    expectNoCommercialPrivateData(activeAds);
  });
});
