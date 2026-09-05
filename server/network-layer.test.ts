import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canAttachWithinMediaLimit } from "./routers/editorial";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("camada oficial da Rede Ojú", () => {
  it("separa executor de administrador e preserva fechamento conceitual versionado", () => {
    const schema = source("drizzle/schema.ts");
    const router = source("server/routers/network.ts");
    expect(schema).toContain("networkExecutors");
    expect(schema).toContain("commercialClosings");
    expect(schema).toContain("executorPercent");
    expect(schema).toContain("commercialPolicyVersion");
    expect(router).toContain("prepareClosing");
    expect(router).toContain("financialStatus");
  });

  it("mantém no máximo cinco fotos e dois vídeos em qualquer conteúdo", () => {
    const base = { contentKind: "Cobertura", photoLimit: 99, videoLimit: 99, hasEventRelation: true };
    expect(canAttachWithinMediaLimit({ ...base, mediaType: "foto", attachedPhotoCount: 4, attachedVideoCount: 0 })).toBe(true);
    expect(canAttachWithinMediaLimit({ ...base, mediaType: "foto", attachedPhotoCount: 5, attachedVideoCount: 0 })).toBe(false);
    expect(canAttachWithinMediaLimit({ ...base, mediaType: "vídeo", attachedPhotoCount: 0, attachedVideoCount: 1 })).toBe(true);
    expect(canAttachWithinMediaLimit({ ...base, mediaType: "vídeo", attachedPhotoCount: 0, attachedVideoCount: 2 })).toBe(false);
  });

  it("protege o miniclip comercial por autorização e mantém histórico de substituição", () => {
    const network = source("server/routers/network.ts");
    const media = source("server/routers/media.ts");
    const commercial = source("server/routers/commercial.ts");
    expect(network).toContain("updateExecutor");
    expect(network).toContain("publicVisible");
    expect(network).not.toContain("Somente o Super Admin define a visibilidade pública do fotógrafo no portal.");
    expect(network).toContain('status: "Substituído"');
    expect(network).toContain("authorizedForHome");
    expect(media).toContain("commercialMiniclips");
    expect(commercial).toContain("homeFeatured: false, authorizedForHome: false");
  });

  it("evita duplicação de mídia e sobrescrita silenciosa entre duas sessões", () => {
    const schema = source("drizzle/schema.ts");
    const editorial = source("server/routers/editorial.ts");
    const editor = source("client/src/pages/admin/PublicationEdit.tsx");
    expect(schema).toContain("publication_media_unique_idx");
    expect(editorial).toContain("eq(publications.version, expectedVersion)");
    expect(editorial).toContain("updateResult[0]?.affectedRows");
    expect(editor).toContain("Outra pessoa atualizou este conteúdo.");
  });

  it("expõe os contadores e a duração máxima de vídeo na interface e no servidor", () => {
    const panel = source("client/src/pages/admin/CoverageMediaPanel.tsx");
    const server = source("server/_core/index.ts");
    expect(panel).toContain("Fotos {photoCount} / {MAX_PHOTOS}");
    expect(panel).toContain("Vídeos {videoCount} / {documentaryPhotos ? 0 : MAX_VIDEOS}");
    expect(panel).toContain("uploaded.durationSeconds ?? duration");
    expect(server).toContain('import { parseBuffer } from "music-metadata"');
    expect(server).toContain("O vídeo ultrapassa o máximo absoluto de 60 segundos.");
  });
});
