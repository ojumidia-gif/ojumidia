import { test as base } from "@playwright/test";
import { TestLedger } from "../lib/testLedger";

type QaAutoFixtures = {
  ledger: TestLedger;
};

/**
 * Fixture mutante: ledger por teste + cleanup no teardown (finally do Playwright).
 * Falha de cleanup falha o teste mesmo se o corpo passou.
 * Nenhum DELETE de produto nesta fase — handlers são mocks ou futuros IDs do próprio ledger.
 */
export const test = base.extend<QaAutoFixtures>({
  ledger: async ({}, use, testInfo) => {
    const ledger = new TestLedger();
    await testInfo.attach("qa-auto-meta", {
      body: JSON.stringify({
        testRunId: ledger.runId,
        storagePrefix: ledger.storagePrefix,
        persona: testInfo.project.name,
        flow: testInfo.title,
      }),
      contentType: "application/json",
    });
    await use(ledger);
    const cleanup = await ledger.runCleanup();
    if (!cleanup.ok) {
      throw new Error(`QA-AUTO cleanup FAIL: ${cleanup.reason}`);
    }
  },
});

export { expect } from "@playwright/test";
