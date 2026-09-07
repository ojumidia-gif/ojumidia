import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  amountsMatchFrozen,
  clientMayConfirmPayment,
  closedPaymentMayReturnToPaid,
  parsePaymentWebhookPayload,
  paymentControlsDirectoryVisibility,
  paymentIntentToSettlementStatus,
  PAYMENT_ENV_NAMES,
  verifyPaymentWebhookSignature,
} from "./paymentProvider";
import { PRODUCTION_MINICLIP_SECONDS, PRODUCTION_PHOTO_CAP } from "./networkProductions";
import { specialtyGrantsPrivilege } from "./professionalSpecialties";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

function signed(secret: string, body: string, timestamp: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

describe("Fase 6 — pagamento reconciliado, diretório público e Home curada", () => {
  it("valida valor congelado, rejeita webhook inválido e é idempotente", () => {
    expect(amountsMatchFrozen(1000, 1000)).toBe(true);
    expect(amountsMatchFrozen(1000, 100)).toBe(false);
    expect(clientMayConfirmPayment()).toBe(false);
    const body = JSON.stringify({ eventId: "evt-1", providerTransactionId: "pix_1", status: "Pago", amount: 1000, productionId: 3, opportunityId: 9 });
    expect(parsePaymentWebhookPayload(body).ok).toBe(true);
    expect(verifyPaymentWebhookSignature({ secret: "", rawBody: body, signature: "x", timestamp: "1" }).ok).toBe(false);
    const ts = String(Math.floor(Date.now() / 1000));
    expect(verifyPaymentWebhookSignature({ secret: "s", rawBody: body, signature: signed("s", body, ts), timestamp: ts }).ok).toBe(true);
    expect(verifyPaymentWebhookSignature({ secret: "s", rawBody: body, signature: "deadbeef", timestamp: ts }).ok).toBe(false);
    expect(source("server/networkPayments.ts")).toContain("duplicate");
    expect(source("server/networkPayments.ts")).toContain("amountsMatchFrozen");
    expect(source("server/paymentWebhook.ts")).toContain("/api/payments/webhook");
    expect(PAYMENT_ENV_NAMES).toContain("PAYMENT_WEBHOOK_SECRET");
  });

  it("não deixa o cliente marcar pago, não recalcula Opportunity e refund não gera nova cobrança", () => {
    expect(paymentIntentToSettlementStatus("Pago")).toBe("Pagamento confirmado");
    expect(closedPaymentMayReturnToPaid("Encerrado")).toBe(false);
    expect(source("server/networkCommerce.ts")).toContain("fromWebhook");
    expect(source("server/networkPayments.ts")).not.toContain("update(networkOpportunities");
    expect(source("server/networkPayments.ts")).toContain("Estorno não gera nova cobrança");
    expect(source("server/networkPayments.ts")).not.toContain("cardNumber");
    expect(source("drizzle/schema.ts")).not.toContain("cvv");
    expect(source("client/src/pages/admin/NetworkCommerceAdmin.tsx")).toContain("Pago só pelo webhook");
  });

  it("diretório público reutiliza perfil profissional, sem ranking nem pay-to-appear", () => {
    expect(paymentControlsDirectoryVisibility()).toBe(false);
    expect(source("server/networkDirectory.ts")).toContain("professionalProfiles");
    expect(source("server/networkDirectory.ts")).not.toContain("publicPhotographersTable");
    expect(source("server/networkDirectory.ts")).not.toContain("users.role");
    expect(source("server/networkDirectory.ts")).not.toMatch(/\bscore\b|\branking\b/);
    expect(source("server/networkDirectory.ts")).toContain("publicVisible");
    expect(source("server/networkDirectory.ts")).toContain('eq(professionalProfiles.status, "Ativo")');
    expect(source("client/src/App.tsx")).toContain("/rede");
    expect(source("client/src/pages/NetworkPublic.tsx")).toContain("Sem score");
    expect(specialtyGrantsPrivilege("fotografo", "administrador")).toBe(false);
  });

  it("perfil público não vira portfólio e mídia respeita 5 JPG + 1 miniclip", () => {
    expect(PRODUCTION_PHOTO_CAP).toBe(5);
    expect(PRODUCTION_MINICLIP_SECONDS).toBe(60);
    expect(source("server/networkDirectory.ts")).toContain("productionMediaWithinLimit");
    expect(source("client/src/pages/NetworkProfessionalPublic.tsx")).toContain("não um portfólio");
    expect(source("client/src/App.tsx")).not.toContain("/portfolio");
    expect(source("server/networkDirectory.ts")).not.toContain("email:");
  });

  it("Home permanece editorial, Opportunity privada e pagamento não compra visibilidade", () => {
    expect(source("client/src/pages/Home.tsx")).toContain("editorial.featured");
    expect(source("client/src/pages/Home.tsx")).not.toContain("pay to appear");
    expect(source("client/src/lib/portalContent.ts")).toContain('href: "/rede"');
    expect(source("client/src/App.tsx")).not.toContain('path={"/oportunidades"}');
    expect(source("server/networkDirectory.ts")).not.toContain("networkOpportunities");
    expect(source("server/networkPayments.ts")).toContain("Pagamento não controla diretório");
    expect(source("server/_core/index.ts")).not.toMatch(/CREATE TABLE|ALTER TABLE/);
    expect(source("server/networkPayments.ts")).not.toMatch(/CREATE TABLE|ALTER TABLE/);
    expect(source("drizzle/0053_network_payments_directory.sql")).toContain("networkPaymentIntents");
  });
});
