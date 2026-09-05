import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("contrato de homologação do upload e independência da plataforma", () => {
  it("não carrega runtime de plataforma anterior", () => {
    expect(read("package.json")).not.toContain("vite-plugin-manus-runtime");
    expect(read("vite.config.ts")).not.toContain("manus");
    expect(existsSync(resolve(root, "server/_core/heartbeat.ts"))).toBe(false);
  });

  it("não usa endpoint legado de LLM como fallback", () => {
    const llm = read("server/_core/llm.ts");
    expect(llm).not.toContain("forge.manus.im");
    expect(llm).toContain("BUILT_IN_FORGE_API_URL");
  });

  it("sobe arquivo pelo servidor autenticado, não por URL pré-assinada no navegador", () => {
    const runtime = read("server/_core/index.ts");
    const client = read("client/src/lib/mediaUpload.ts");
    expect(runtime).toContain('app.post("/api/media/upload"');
    expect(runtime).toContain("storagePut");
    expect(runtime).toContain('url: uploaded.url, key: uploaded.key');
    expect(runtime).toContain("Faça login para enviar arquivos.");
    expect(client).toContain('xhr.open("POST", "/api/media/upload")');
    expect(client).toContain("xhr.withCredentials = true");
    expect(client).toContain("xhr.upload.onprogress");
  });

  it("expõe estados de palco e limites na interface de conteúdo", () => {
    const stage = read("client/src/components/MediaStage.tsx");
    const coverage = read("client/src/pages/admin/CoverageMediaPanel.tsx");
    const miniclips = read("client/src/pages/admin/MiniclipsAdmin.tsx");
    expect(stage).toContain('"Selecionado" | "Preparando" | "Enviando" | "Processando" | "Pronto" | "Falhou"');
    expect(coverage).toContain("Fotos ${photoCount + stagedPhotos} / ${MAX_PHOTOS}");
    expect(coverage).toContain("Vídeos ${videoCount + stagedVideos} / ${MAX_VIDEOS}");
    expect(miniclips).toContain('useMediaStage("miniclipe")');
  });

  it("documenta o alias legado /manus-storage sem usá-lo como URL pública nova", () => {
    const storage = read("server/storage.ts");
    expect(storage).toContain('export const MEDIA_PUBLIC_PREFIX = "/media-storage"');
    expect(storage).toContain("publicMediaUrl(key)");
    expect(storage).not.toMatch(/return `\$\{MEDIA_LEGACY_PREFIX\}\/\$\{/);
  });
});
