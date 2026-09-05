import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("governança financeira da rede Ojú", () => {
  it("mantém políticas versionadas e notificações de repasse em tabelas auditáveis", () => {
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain("commercialPolicies");
    expect(schema).toContain("commercialPayoutNotifications");
    expect(schema).toContain("commercialPolicyVersion");
    expect(schema).toContain("captorPayoutStatus");
    expect(schema).toContain('commercialPolicyStatuses = ["Rascunho", "Ativa", "Substituída", "Arquivada"]');
  });

  it("reserva políticas, repasses e histórico global ao Super Admin", () => {
    const router = source("server/routers/financial.ts");
    expect(router).toContain("requireFinancialPrincipal(ctx.user.role)");
    expect(router).toContain("activatePolicy");
    expect(router).toContain('status: "Substituída"');
    expect(router).toContain("markNotificationRead");
    expect(router).toContain("partnerShareFromPolicy");
    expect(router).not.toContain("* .95");
    expect(router).toContain("commercialPolicyVersion");
  });

  it("aplica somente regra ativa a novas captações e preserva sua versão no fechamento", () => {
    const commercial = source("server/routers/commercial.ts");
    const community = source("server/routers/community.ts");
    expect(commercial).toContain('activeCommercialPolicy(db, "Anúncio")');
    expect(commercial).toContain("commercialPolicyId: policy?.id ?? null");
    expect(community).toContain('activeCommercialPolicy(db, "Visibilidade institucional")');
    expect(community).toContain("commercialPolicyVersion: policy?.version ?? null");
  });

  it("gera aviso para a carteira responsável somente quando o repasse muda para pago", () => {
    const commercial = source("server/routers/commercial.ts");
    const community = source("server/routers/community.ts");
    expect(commercial).toContain('input.payoutStatus === "Pago" && ad.payoutStatus !== "Pago"');
    expect(community).toContain('input.captorPayoutStatus === "Pago" && current.subscription.captorPayoutStatus !== "Pago"');
    expect(commercial).toContain("createPayoutNotification");
    expect(community).toContain("createPayoutNotification");
  });
});
