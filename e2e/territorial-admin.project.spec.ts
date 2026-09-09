import { test } from "@playwright/test";

test("projeto territorial-admin preparado (sem duplicar a suíte autenticada)", () => {
  test.skip(
    true,
    "QA-AUTO-02: os testes territoriais reais permanecem em auth.authenticated.spec.ts para não triplicar. Exige e2e/.auth/territorial-admin.json (OAuth real, conta de QA).",
  );
});
