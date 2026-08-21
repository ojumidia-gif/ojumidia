import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("termos de responsabilidade de administradores", () => {
  it("mantém a trilha auditável do termo e obriga assinatura exclusiva via gov.br", () => {
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain("administratorResponsibilityTerms");
    expect(schema).toContain('signatureProvider: mysqlEnum("signatureProvider", ["gov.br"])');
    expect(schema).toContain('"Assinado via gov.br"');
    expect(schema).toContain('templateVersion: varchar("templateVersion", { length: 80 }).default("OJU-AR-1.0")');
  });

  it("não ativa papel administrativo sem termo assinado e preserva o Super Admin", () => {
    const db = source("server/db.ts");
    expect(db).toContain("const activeResponsibilityTerm = grant?.role === \"administrador\"");
    expect(db).toContain('grant && (grant.role !== "administrador" || activeResponsibilityTerm)');
    expect(db).toContain('values.role = "criador"');
    expect(db).toContain("if (isLocalPrimaryAdmin)");
  });

  it("ativa a conta somente após anexo assinado e nunca retorna URL privada na lista", () => {
    const router = source("server/routers/collaborators.ts");
    expect(router).toContain("createResponsibilityTerm");
    expect(router).toContain("attachSignedResponsibilityTerm");
    expect(router).toContain('status: "Assinado via gov.br"');
    expect(router).toContain("await synchronizeGrantedAccountRole(db, grant)");
    expect(router).toContain("hasSignedDocument: Boolean(_signedDocumentUrl && _signedStorageKey)");
  });

  it("protege o PDF por sessão e por propriedade do administrador", () => {
    const files = source("server/privateCommercialFiles.ts");
    expect(files).toContain("/api/governance/administrator-responsibility-terms/:termId/document");
    expect(files).toContain("sameAdministrator");
    expect(files).toContain('"administrador principal" || sameAdministrator');
    expect(files).toContain('"Cache-Control", "private, no-store"');
  });
});
