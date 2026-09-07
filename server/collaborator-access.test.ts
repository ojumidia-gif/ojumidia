import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("gestão individual de colaboradores", () => {
  it("requer autorização administrativa explícita além do papel registrado", () => {
    const schema = source("drizzle/schema.ts");
    const trpc = source("server/_core/trpc.ts");
    expect(schema).toContain('adminAccess: boolean("adminAccess").default(false)');
    expect(schema).toContain("collaboratorAccessGrants");
    expect(trpc).toContain("ctx.user.adminAccess === false");
  });

  it("proíbe a autorização do e-mail comercial e limita a gestão ao administrador principal", () => {
    const router = source("server/routers/collaborators.ts");
    expect(router).toContain('const COMMERCIAL_CONTACT_EMAIL = "ojumidia@gmail.com"');
    expect(router).toContain("não pode receber autorização administrativa");
    expect(router).toContain("Somente o administrador principal pode gerenciar colaboradores");
    expect(router).toContain('const collaboratorRoles = ["criador", "editor", "aprovador", "administrador"]');
    expect(source("drizzle/schema.ts")).toContain("collaboratorAccessGrants");
    expect(router).toContain("Administrador territorial precisa de Parceiro Ojú");
    expect(router).toContain("setAccountStatus");
    expect(router).toContain("Não é permitido alterar o próprio escopo");
  });

  it("vincula o convite ao primeiro login e centraliza a ativação de papel na sincronização do grant", () => {
    const db = source("server/db.ts");
    const router = source("server/routers/collaborators.ts");
    const media = source("server/routers/media.ts");
    expect(db).toContain("matchedUser");
    expect(db).toContain("collaboratorAccessGrants).set({ userId: matchedUser.id }");
    expect(router).toContain("synchronizeGrantedAccountRole");
    expect(router).toContain('grant.role !== "administrador" || Boolean(signedTerm)');
    expect(media).not.toContain("updateRole:");
  });
});
