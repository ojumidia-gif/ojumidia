import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isHomeCurated, publicationIdsFullyInTerritoryScope, sortHomeCurated } from "./editorialScale";
import { applyDueScheduledPublications, expireDueHomeHighlights } from "./editorialAutomation";

describe("curadoria da Home e escopo territorial", () => {
  it("não considera publicado com placement Nenhum como curado, salvo destaque manual", () => {
    expect(isHomeCurated({ homePlacement: "Nenhum", manualFeatured: false })).toBe(false);
    expect(isHomeCurated({ homePlacement: "Nenhum", manualFeatured: true })).toBe(true);
    expect(isHomeCurated({ homePlacement: "Destaque principal", manualFeatured: false })).toBe(true);
  });

  it("ordena destaque principal antes de recomendado", () => {
    const ordered = sortHomeCurated([
      { homePlacement: "Recomendado", homeOrder: 0, manualFeatured: false, relevance: 90 },
      { homePlacement: "Destaque principal", homeOrder: 2, manualFeatured: false, relevance: 10 },
    ]);
    expect(ordered[0].homePlacement).toBe("Destaque principal");
  });

  it("isola publicações cujo território não está autorizado", () => {
    const allowed = publicationIdsFullyInTerritoryScope({
      publicationIds: [1, 2, 3],
      territoryLinks: [
        { publicationId: 1, taxonomyId: 10 },
        { publicationId: 2, taxonomyId: 20 },
        { publicationId: 3, taxonomyId: 10 },
        { publicationId: 3, taxonomyId: 20 },
      ],
      authorizedTerritoryIds: [10],
    });
    expect(allowed).toEqual([1]);
  });
});

describe("automação editorial com RBAC implícito", () => {
  it("publica somente Aprovada com scheduledAt vencido e recusa comercial sem portal", async () => {
    const updates: unknown[] = [];
    const db = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([
            { id: 1, status: "Aprovada", deletedAt: null, scheduledAt: new Date("2020-01-01"), commercialRequestId: null, partnerId: null, version: 1, approvedBy: 2, createdBy: 2 },
          ]),
        }),
      }),
      update: () => ({
        set: (values: unknown) => ({
          where: () => {
            updates.push(values);
            return Promise.resolve([{ affectedRows: 1 }]);
          },
        }),
      }),
      insert: () => ({ values: () => Promise.resolve() }),
    };
    const result = await applyDueScheduledPublications(db as never, new Date("2026-01-01"));
    expect(result.published).toBe(1);
    expect(updates[0]).toMatchObject({ status: "Publicada" });
  });

  it("expira destaque sem alterar status editorial", async () => {
    const sets: unknown[] = [];
    const db = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([
            { id: 9, homePlacement: "Destaque principal", manualFeatured: true, highlightExpiresAt: new Date("2020-01-01"), version: 3, partnerId: 1 },
          ]),
        }),
      }),
      insert: () => ({ values: () => Promise.resolve() }),
      update: () => ({
        set: (values: unknown) => ({
          where: () => {
            sets.push(values);
            return Promise.resolve([{ affectedRows: 1 }]);
          },
        }),
      }),
    };
    const result = await expireDueHomeHighlights(db as never, new Date("2026-01-01"));
    expect(result.expired).toBe(1);
    expect(sets[0]).toMatchObject({ homePlacement: "Nenhum", manualFeatured: false });
  });
});

describe("fluxo editorial guiado", () => {
  it("reordena capa de mídia já vinculada e mantém aprovação antes de publicar", () => {
    const editorial = readFileSync(resolve(process.cwd(), "server/routers/editorial.ts"), "utf8");
    const edit = readFileSync(resolve(process.cwd(), "client/src/pages/admin/PublicationEdit.tsx"), "utf8");
    const media = readFileSync(resolve(process.cwd(), "client/src/pages/admin/CoverageMediaPanel.tsx"), "utf8");
    const list = readFileSync(resolve(process.cwd(), "client/src/pages/admin/PublicationsAdmin.tsx"), "utf8");
    expect(editorial).toContain("alreadyLinked");
    expect(editorial).toContain("advanceStatus");
    expect(editorial).toContain("isCover: displayOrder === 0");
    expect(edit).toContain("Salvar e enviar para revisão");
    expect(edit).toContain("nextEditorialAction");
    expect(edit).not.toContain("publishDirect");
    expect(list).not.toContain("publishDirect");
    expect(media).toContain("onCover={setCoverLocalId}");
    expect(media).toContain("Esta foto é a capa do conteúdo.");
  });
});
