import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isHomeHighlightUnexpired, sortHomeCurated } from "./editorialScale";
import { originationChangesDirectoryRank, originationCreatesHomeFeature } from "@shared/professionalOrigination";
import {
  decideCommunityHouseDirectory,
  decideExecutorPhotographerPage,
  paymentNeverBuysEditorialOrDirectory,
  publicationEligibleForPortal,
} from "@shared/territorialVisibility";
import { portalAuthorizedSearchPage } from "./routers/editorial";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Missão 6.1 — invariantes de visibilidade", () => {
  it("pagamento não ordena a Home editorial", () => {
    const featured = source("server/routers/editorial.ts").split("featured: publicProcedure")[1]?.split("photoDocumentary:")[0] || "";
    expect(featured).not.toContain("publications.sponsored");
    expect(featured).toContain("sortHomeCurated");
    expect(paymentNeverBuysEditorialOrDirectory()).toBe(true);
    const paidFirst = { homePlacement: "Recomendado", homeOrder: 2, manualFeatured: false, relevance: 10, sponsored: true };
    const unpaid = { homePlacement: "Recomendado", homeOrder: 1, manualFeatured: false, relevance: 10, sponsored: false };
    expect(sortHomeCurated([paidFirst, unpaid])[0]).toBe(unpaid);
  });

  it("originação não aumenta visibilidade", () => {
    expect(originationCreatesHomeFeature()).toBe(false);
    expect(originationChangesDirectoryRank()).toBe(false);
    expect(source("server/professionalOrigination.ts")).not.toContain("homePlacement");
  });

  it("quarentena, lixeira e destaque expirado não entram no portal nem na Home", () => {
    const published = { status: "Publicada", isPublic: true, quarantinedAt: null as Date | null, deletedAt: null as Date | null, commercialRequestId: null as number | null, commerciallyAuthorized: true };
    expect(publicationEligibleForPortal({ ...published, quarantinedAt: new Date() })).toBe(false);
    expect(publicationEligibleForPortal({ ...published, deletedAt: new Date() })).toBe(false);
    expect(isHomeHighlightUnexpired(new Date("2020-01-01"), new Date("2026-09-09"))).toBe(false);
    expect(isHomeHighlightUnexpired(null, new Date("2026-09-09"))).toBe(true);
    const featured = source("server/routers/editorial.ts").split("featured: publicProcedure")[1]?.split("photoDocumentary:")[0] || "";
    expect(featured).toContain("isNull(publications.quarantinedAt)");
    expect(featured).toContain("isNull(publications.deletedAt)");
    expect(featured).toContain("isHomeHighlightUnexpired");
    expect(featured).toContain("highlightExpiresAt");
  });

  it("serviço comunitário sem plano e fotógrafo inelegível não aparecem", () => {
    expect(decideCommunityHouseDirectory({
      status: "Publicada",
      consentStatus: "Autorizado",
      deletedAt: null,
      directoryScope: "Serviço comunitário",
      hasActiveInstitutionalVisibilityPlan: false,
    }).allowed).toBe(false);
    expect(decideExecutorPhotographerPage({ publicVisible: false, publicSlug: "ana" }).allowed).toBe(false);
    expect(decideExecutorPhotographerPage({ publicVisible: true, publicSlug: "" }).allowed).toBe(false);
    expect(source("server/routers/community.ts")).toContain("communityHouseIsPubliclyListed");
    expect(source("server/routers/community.ts")).toContain("publicInstitutionMap");
    expect(source("server/routers/community.ts")).not.toContain("Number(Boolean(b.visibilityPlan))");
    expect(source("server/routers/editorial.ts")).toContain("decideExecutorPhotographerPage");
    expect(source("server/routers/editorial.ts")).toContain("publicPhotographers");
  });

  it("total/hasMore da busca considera só o que o visitante pode receber", () => {
    const permitted = [{ id: 1 }, { id: 3 }];
    expect(portalAuthorizedSearchPage(permitted, 0, 24)).toEqual({ page: permitted, total: 2, hasMore: false });
    expect(portalAuthorizedSearchPage(Array.from({ length: 30 }, (_, id) => ({ id })), 0, 24).hasMore).toBe(true);
    expect(portalAuthorizedSearchPage(Array.from({ length: 30 }, (_, id) => ({ id })), 0, 24).total).toBe(30);
    const search = source("server/routers/editorial.ts").split("search: publicProcedure")[1]?.split("featured: publicProcedure")[0] || "";
    expect(search).toContain("portalAuthorizedPublications");
    expect(search).toContain("portalAuthorizedSearchPage");
    expect(search).not.toContain("hasMore: input.offset + records.length < total");
  });
});
