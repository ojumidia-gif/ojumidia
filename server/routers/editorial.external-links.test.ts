import { describe, expect, it } from "vitest";
import { canEditPublication } from "../editorialPolicy";
import { canExposeOnPublicPortal, toPortalPublication } from "./editorial";

const kinds = ["História", "Cobertura", "Documentário", "Projeto", "Fotografia documental"] as const;

function publication(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    title: "Registro",
    slug: "registro",
    contentKind: "Cobertura",
    subtitle: null,
    summary: null,
    body: null,
    status: "Publicada",
    teamId: 9,
    createdBy: 1,
    editedBy: null,
    approvedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
    isPublic: true,
    unpublishedAt: null,
    unpublishedBy: null,
    deletedAt: null,
    deletedBy: null,
    deletionNote: null,
    coverageStart: null,
    coverageEnd: null,
    relevance: 0,
    manualFeatured: false,
    sponsored: false,
    sponsorDisclosure: null,
    commercialRequestId: null,
    photoLimit: 5,
    videoLimit: 1,
    externalAlbumUrl: null,
    externalVideoUrl: null,
    homePlacement: "Nenhum",
    homeOrder: 0,
    scheduledAt: null,
    highlightExpiresAt: null,
    version: 1,
    quarantinedAt: null,
    ...overrides,
  } as any;
}

describe("link externo editorial no serializer público", () => {
  it("não devolve seção quando a publicação não tem URL", () => {
    const payload = toPortalPublication(publication(), null);
    expect(payload.completeProductions).toEqual([]);
    expect(payload).not.toHaveProperty("externalAlbumUrl");
    expect(payload).not.toHaveProperty("externalVideoUrl");
    expect(payload).not.toHaveProperty("externalAlbumLabel");
    expect(payload).not.toHaveProperty("externalVideoLabel");
    expect(payload).not.toHaveProperty("createdBy");
    expect(payload).not.toHaveProperty("version");
  });

  it("devolve URL sanitizada e rótulo derivado para publicação publicada", () => {
    const payload = toPortalPublication(publication({
      contentKind: "Cobertura",
      externalAlbumUrl: "https://album.example/completo",
    }), null);
    expect(payload.completeProductions).toEqual([{ url: "https://album.example/completo", label: "Ver álbum completo" }]);
  });

  it("devolve label personalizado no serializer público e omite as colunas internas", () => {
    const payload = toPortalPublication(publication({
      contentKind: "Cobertura",
      externalAlbumUrl: "https://album.example/completo",
      externalAlbumLabel: "Acessar registro completo",
    }), null);
    expect(payload.completeProductions).toEqual([{ url: "https://album.example/completo", label: "Acessar registro completo" }]);
    expect(payload).not.toHaveProperty("externalAlbumLabel");
  });

  it("usa fallback quando o label está vazio ou só com espaços", () => {
    expect(toPortalPublication(publication({
      contentKind: "Projeto",
      externalAlbumUrl: "https://projeto.example/p",
      externalAlbumLabel: "   ",
    }), null).completeProductions).toEqual([{ url: "https://projeto.example/p", label: "Ver projeto completo" }]);
  });

  it("aceita label de vídeo distinta quando o endereço é outro", () => {
    const payload = toPortalPublication(publication({
      contentKind: "Documentário",
      externalAlbumUrl: "https://projeto.example",
      externalVideoUrl: "https://video.example/filme",
    }), null);
    expect(payload.completeProductions).toEqual([
      { url: "https://projeto.example/", label: "Ver documentário completo" },
      { url: "https://video.example/filme", label: "Ver documentário completo" },
    ]);
  });

  it("omite javascript:, data: e HTML do serializer público", () => {
    const payload = toPortalPublication(publication({
      externalAlbumUrl: "javascript:alert(1)",
      externalVideoUrl: "data:text/html,<script>x</script>",
    }), null);
    expect(payload.completeProductions).toEqual([]);
  });

  it("não expõe o link em rascunho, quarentena, lixeira ou conteúdo oculto", () => {
    const url = "https://album.example/completo";
    const label = "Acessar registro completo";
    expect(toPortalPublication(publication({ status: "Rascunho", externalAlbumUrl: url, externalAlbumLabel: label }), null).completeProductions).toEqual([]);
    expect(canExposeOnPublicPortal(publication({ status: "Rascunho" }))).toBe(false);
    expect(toPortalPublication(publication({ quarantinedAt: new Date(), externalAlbumUrl: url, externalAlbumLabel: label }), null).completeProductions).toEqual([]);
    expect(toPortalPublication(publication({ deletedAt: new Date(), externalAlbumUrl: url, externalAlbumLabel: label }), null).completeProductions).toEqual([]);
    expect(toPortalPublication(publication({ isPublic: false, externalAlbumUrl: url, externalAlbumLabel: label }), null).completeProductions).toEqual([]);
  });

  it("não publica o link de cobertura contratada sem autorização de portal", () => {
    const payload = toPortalPublication(publication({
      commercialRequestId: 91,
      externalAlbumUrl: "https://album.example/completo",
    }), null);
    expect(payload.completeProductions).toEqual([]);
    expect(payload.editorialAuthorization?.authorized).toBe(false);
  });

  it("mantém o mesmo campo reutilizado para todos os tipos editoriais do portal", () => {
    const expected: Record<(typeof kinds)[number], string> = {
      História: "Ver história completa",
      Cobertura: "Ver álbum completo",
      Documentário: "Ver documentário completo",
      Projeto: "Ver projeto completo",
      "Fotografia documental": "Ver produção completa",
    };
    for (const contentKind of kinds) {
      const payload = toPortalPublication(publication({ contentKind, externalAlbumUrl: "https://destino.example/p" }), null);
      expect(payload.completeProductions).toEqual([{ url: "https://destino.example/p", label: expected[contentKind] }]);
    }
  });

  it("não altera quem pode editar: criador não edita publicação aprovada; admin continua podendo", () => {
    expect(canEditPublication("criador", "Aprovada")).toBe(false);
    expect(canEditPublication("administrador", "Publicada")).toBe(true);
  });
});
