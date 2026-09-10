import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  administratorIsAutomaticallyBeneficiary,
  architecturalDebts,
  betaAllowsPublicGrowthWithoutCheckout,
  clientPaidAmountIsAutomaticallyOjuRevenue,
  commercialCaptureEconomicsFrozen,
  commercialCaptureEconomicsMatch,
  commercialPayoutStatusIsBankSettlement,
  contractsAdministratorShareIsApprovedEconomicRule,
  directoryVisibilityIsPurchasable,
  dualRailJoinHints,
  economicProducts,
  editorialWindowIsFinancialCap,
  editorialWindowPerUnit,
  forbiddenCreations,
  isRealMonetizationActive,
  isRealPspConnected,
  originationEqualsPayment,
  payoutSurfaces,
  publicClientMayConfirmPayment,
  acceptedOperationRereadsLivePolicy,
} from "./economicFoundation";

describe("fundação econômica do Beta", () => {
  it("mantém monetização e PSP reais desligados", () => {
    expect(isRealMonetizationActive()).toBe(false);
    expect(isRealPspConnected()).toBe(false);
    expect(publicClientMayConfirmPayment()).toBe(false);
    expect(directoryVisibilityIsPurchasable()).toBe(false);
    expect(clientPaidAmountIsAutomaticallyOjuRevenue()).toBe(false);
    expect(administratorIsAutomaticallyBeneficiary()).toBe(false);
    expect(originationEqualsPayment()).toBe(false);
    expect(editorialWindowIsFinancialCap()).toBe(false);
    expect(acceptedOperationRereadsLivePolicy()).toBe(false);
    expect(betaAllowsPublicGrowthWithoutCheckout()).toBe(true);
    expect(commercialCaptureEconomicsFrozen("Ativo")).toBe(true);
    expect(commercialCaptureEconomicsFrozen("Rascunho")).toBe(false);
    expect(commercialCaptureEconomicsMatch({ contractedAmount: "100.00", ojuSharePercent: "60.00", captorSharePercent: "40.00" }, { contractedAmount: 100, ojuSharePercent: 60, captorSharePercent: 40 })).toBe(true);
  });

  it("trata 5+1 como janela editorial por unidade, não cota financeira", () => {
    expect(editorialWindowPerUnit).toEqual({ photos: 5, miniclips: 1, miniclipSeconds: 60 });
  });

  it("não cobra existência na Rede e classifica produtos já existentes", () => {
    expect(economicProducts["rede-gratuita"].stance).toBe("never");
    expect(economicProducts["presenca-territorial-basica"].stance).toBe("never");
    expect(economicProducts["documentacao-memoria"].stance).toBe("never");
    expect(economicProducts["producao-cobertura"].stance).toBe("beta-off-future-possible");
    expect(economicProducts.originacao.existingSurfaces.join(" ")).toContain("OJU_ORIGIN_V1");
  });

  it("recusa engines, carteira e marketplace como criações desta fase", () => {
    expect(forbiddenCreations).toContain("MonetizationEngine");
    expect(forbiddenCreations).toContain("wallet / saldo / carteira de profissional");
    expect(architecturalDebts).toContain("dual-rail-mesa-vs-rede");
    expect(architecturalDebts).toContain("contracts-default-30-70-administrator");
  });

  it("classifica payout e 30/70 como intenção/dívida, não liquidação nem regra aprovada", () => {
    expect(commercialPayoutStatusIsBankSettlement()).toBe(false);
    expect(contractsAdministratorShareIsApprovedEconomicRule()).toBe(false);
    expect(dualRailJoinHints.contractsMissing).toContain("opportunityId");
    expect(payoutSurfaces.commercialPayoutNotifications).toMatch(/não é TED/);
  });

  it("não adiciona SDK de PSP nem carteira no manifesto", () => {
    const pkg = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(pkg).not.toMatch(/mercadopago|stripe|asaas|pagar\.me/i);
    const foundation = readFileSync(resolve(process.cwd(), "shared/economicFoundation.ts"), "utf8");
    expect(foundation).not.toContain("class MonetizationEngine");
    expect(foundation).not.toContain("walletBalance");
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    expect(schema).toContain('default("30.00")');
    expect(schema).toContain('default("70.00")');
    expect(schema).toContain("administratorSharePercent");
  });
});
