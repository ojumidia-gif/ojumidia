import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_MINICLIP_DURATION_SECONDS, MAX_MINICLIPS, MAX_PHOTOS } from "@shared/const";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Fase 7 — prontidão operacional", () => {
  const journal = read("drizzle/meta/_journal.json");
  const sqlFiles = readdirSync(resolve(root, "drizzle")).filter(name => name.endsWith(".sql")).sort();

  it("journal Drizzle inclui 0047 e a cadeia 0048–0053 na ordem", () => {
    expect(journal).toContain('"tag": "0047_governance_beta"');
    expect(journal).toContain('"tag": "0048_coverage_offer_declines"');
    expect(journal).toContain('"tag": "0049_professional_network"');
    expect(journal).toContain('"tag": "0050_network_opportunities"');
    expect(journal).toContain('"tag": "0051_network_productions"');
    expect(journal).toContain('"tag": "0052_network_operations"');
    expect(journal).toContain('"tag": "0053_network_payments_directory"');
    expect(journal.indexOf("0048_coverage_offer_declines")).toBeLessThan(journal.indexOf("0049_professional_network"));
    expect(journal).toContain('"tag": "0055_terms_of_use_and_consent_evidence"');
    expect(journal.indexOf("0054_join_request_practice_varchar")).toBeLessThan(journal.indexOf("0055_terms_of_use_and_consent_evidence"));
    expect(sqlFiles).toContain("0048_coverage_offer_declines.sql");
    expect(journal).toContain('"tag": "0056_network_voices"');
    expect(journal.indexOf("0055_terms_of_use_and_consent_evidence")).toBeLessThan(journal.indexOf("0056_network_voices"));
    expect(sqlFiles).toContain("0054_join_request_practice_varchar.sql");
    expect(sqlFiles).toContain("0055_terms_of_use_and_consent_evidence.sql");
    expect(sqlFiles).toContain("0056_network_voices.sql");
  });

  it("cadeia 0049→0053 é ordenada, com Opportunity única por Production e sem gateway SDK", () => {
    const m49 = read("drizzle/0049_professional_network.sql");
    const m50 = read("drizzle/0050_network_opportunities.sql");
    const m51 = read("drizzle/0051_network_productions.sql");
    const m52 = read("drizzle/0052_network_operations.sql");
    const m53 = read("drizzle/0053_network_payments_directory.sql");
    expect(m49).toContain("CREATE TABLE IF NOT EXISTS `professionalProfiles`");
    expect(m50).toContain("CREATE TABLE IF NOT EXISTS `networkOpportunities`");
    expect(m50).toContain("UNIQUE KEY `network_opportunity_invite_target_unique`");
    expect(m51).toContain("UNIQUE KEY `network_production_opportunity_unique`");
    expect(m52).toContain("UNIQUE KEY `network_production_settlement_production_unique`");
    expect(m53).toContain("ALTER TABLE `professionalProfiles`");
    expect(m53).toContain("CREATE TABLE IF NOT EXISTS `networkPaymentIntents`");
    const pkg = read("package.json");
    expect(pkg).not.toMatch(/stripe|mercadopago|pagseguro/i);
    expect(read("server/networkPayments.ts")).toContain("await getProduction(db, actor, input.productionId)");
    expect(read("server/joinRequestsTable.ts")).not.toMatch(/CREATE TABLE|ALTER TABLE/i);
    expect(read("server/coverageOfferDeclinesTable.ts")).not.toMatch(/CREATE TABLE|ALTER TABLE/i);
  });

  it("janela editorial e SEO de áreas privadas permanecem", () => {
    expect(MAX_PHOTOS).toBe(5);
    expect(MAX_MINICLIPS).toBe(1);
    expect(MAX_MINICLIP_DURATION_SECONDS).toBe(60);
    const robots = read("client/public/robots.txt");
    const sitemap = read("client/public/sitemap.xml");
    const app = read("client/src/App.tsx");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /api/");
    expect(sitemap).toContain("https://ojumidia.com.br/rede");
    expect(sitemap).toContain("/vozes-da-rede");
    expect(sitemap).not.toContain("/admin");
    expect(sitemap).not.toContain("/api/");
    expect(app).toContain('path={"/rede/parceiros/:slug"}');
    expect(read(".env.example")).toContain("PAYMENT_WEBHOOK_SECRET=");
    expect(read(".env.example")).not.toMatch(/sk_live|AIza[A-Za-z0-9]|eyJ/);
  });
});
