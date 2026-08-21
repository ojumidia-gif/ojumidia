import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("prontidão de runtime para Render", () => {
  it("mantém scripts portáveis, health check público e bind explícito de produção", () => {
    const packageJson = read("package.json");
    const runtime = read("server/_core/index.ts");
    expect(packageJson).toContain("cross-env NODE_ENV=development");
    expect(packageJson).toContain("cross-env NODE_ENV=production");
    expect(runtime).toContain('app.get("/health"');
    expect(runtime).toContain('app.get("/ready"');
    expect(runtime).toContain('server.listen(port, "0.0.0.0"');
    expect(runtime).toContain('app.use("/api"');
    expect(runtime).toContain("cross_origin_mutation_forbidden");
  });

  it("mantém o acesso local impossível fora do ambiente de desenvolvimento", () => {
    const localAuth = read("server/_core/localDevAuth.ts");
    expect(localAuth).toContain('process.env.NODE_ENV === "development"');
    expect(localAuth).toContain('if (process.env.NODE_ENV !== "development") return res.sendStatus(404)');
  });

  it("mantém mídias em storage persistente e o expurgo protegido por segredo externo", () => {
    const storage = read("server/storage.ts");
    const proxy = read("server/_core/storageProxy.ts");
    const runtime = read("server/_core/index.ts");
    const cron = read("scripts/render-editorial-trash-cron.mjs");
    expect(storage).toContain("S3_BUCKET");
    expect(storage).toContain("storageGetSignedUrl");
    expect(proxy).toContain("storageGetSignedUrl");
    expect(runtime).toContain("EDITORIAL_TRASH_CRON_SECRET");
    expect(cron).toContain("/api/scheduled/editorial-trash-purge");
  });
});
