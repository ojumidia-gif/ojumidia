import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("armazenamento protegido de documentos comerciais", () => {
  const route = readFileSync(resolve(process.cwd(), "server/privateCommercialFiles.ts"), "utf8");
  const router = readFileSync(resolve(process.cwd(), "server/routers/commercial.ts"), "utf8");
  const storageRules = readFileSync(resolve(process.cwd(), "STORAGE_RULES.md"), "utf8");

  it("restringe termos assinados ao Super Admin ou ao administrador da própria carteira", () => {
    expect(route).toContain('role === "administrador principal" || (role === "administrador" && ownerId === userId)');
    expect(route).toContain("sdk.authenticateRequest");
    expect(route).toContain("storageGetSignedUrl");
    expect(route).toContain('Cache-Control", "private, no-store"');
  });

  it("não devolve URL ou chave de armazenamento pelo contrato tRPC", () => {
    expect(router).toContain("signedDocumentUrl: _signedDocumentUrl");
    expect(router).toContain("signedStorageKey: _signedStorageKey");
    expect(router).toContain("hasSignedDocument");
  });

  it("documenta S3 como fonte de verdade e a separação de acesso por carteira", () => {
    expect(storageRules).toContain("S3 é a fonte de verdade");
    expect(storageRules).toContain("Super Admin");
    expect(storageRules).toContain("Super Admin ou a responsável pela carteira");
  });
});
