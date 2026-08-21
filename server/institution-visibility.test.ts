import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("visibilidade institucional renovável", () => {
  it("amplia os perfis comunitários sem substituir o registro documental", () => {
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain('"Ilê/Terreiro"');
    expect(schema).toContain('"Liderança religiosa"');
    expect(schema).toContain("profileLabel");
    expect(schema).toContain("referenceRole");
  });

  it("mantém a assinatura em tabela própria com vigência e divisão explícita", () => {
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain("institutionVisibilitySubscriptions");
    expect(schema).toContain("expiresAt");
    expect(schema).toContain("developmentAmount");
    expect(schema).toContain("reserveAmount");
  });

  it("calcula expiração por vigência e isola a carteira de cada captador", () => {
    const router = source("server/routers/community.ts");
    expect(router).toContain("isVisibilityActive");
    expect(router).toContain("expirePastInstitutionVisibilities");
    expect(router).toContain('status: "Expirada"');
    expect(router).toContain("institutionVisibilitySubscriptions.expiresAt, now");
    expect(router).toContain("institutionVisibilitySubscriptions.capturedByUserId, ctx.user.id");
    expect(router).toContain("revenueSplit");
  });

  it("atribui a captação ao administrador elegível e reserva a escolha de terceiros ao Super Admin", () => {
    const router = source("server/routers/community.ts");
    const admin = source("client/src/pages/admin/InstitutionVisibilityAdmin.tsx");
    expect(router).toContain("visibilityCaptors");
    expect(router).toContain('const capturedByUserId = isPrincipal(ctx.user.role) ? (input.capturedByUserId ?? null) : ctx.user.id');
    expect(router).toContain("O administrador captador precisa ter acesso administrativo ativo.");
    expect(router).toContain("capturedByName");
    expect(admin).toContain("Administrador responsável pela captação");
    expect(admin).toContain("A participação de captação será atribuída automaticamente à sua própria carteira.");
  });

  it("explica no painel que contribuição não altera curadoria editorial", () => {
    const admin = source("client/src/pages/admin/InstitutionVisibilityAdmin.tsx");
    const registration = source("client/src/pages/admin/InstitutionRegistrationAdmin.tsx");
    expect(admin).toContain("não compra destaque editorial");
    expect(registration).toContain("nunca compra curadoria");
    expect(admin).toContain("R$ 12,90/mês");
  });
});
