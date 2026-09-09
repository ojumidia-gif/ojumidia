import { test } from "@playwright/test";

test("projeto super-admin preparado (sem duplicar a suíte autenticada)", () => {
  test.skip(
    true,
    "QA-AUTO-02: os testes de Super Admin reais permanecem em auth.authenticated.spec.ts para não triplicar. Exige e2e/.auth/super-admin.json (OAuth real, conta de QA).",
  );
});
