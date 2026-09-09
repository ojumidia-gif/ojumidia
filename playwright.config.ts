import { defineConfig, devices } from "@playwright/test";

/**
 * QA-AUTO-02: public + authenticated skeleton + infra de isolamento.
 * Mutations de negócio: abortadas sem E2E_ALLOW_MUTATION + allowlists.
 * webServer local herda DATABASE_URL — localhost ≠ banco isolado.
 */

const e2ePort = process.env.E2E_PORT || "3100";
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/qa-auto-results.json" }],
  ],
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm exec cross-env NODE_ENV=development tsx server/_core/index.ts",
        url: `${baseURL}/health`,
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          PORT: e2ePort,
          NODE_ENV: "development",
          OJU_LOCAL_DEV_LOGIN_ENABLED: "false",
        },
      },
  projects: [
    {
      name: "public",
      testMatch: ["**/public.spec.ts", "**/navigation.spec.ts", "**/errors.spec.ts"],
    },
    {
      name: "professional",
      testMatch: ["**/auth.authenticated.spec.ts", "**/professional.origination.spec.ts"],
    },
    {
      name: "territorial-admin",
      testMatch: "**/territorial-admin.project.spec.ts",
    },
    {
      name: "super-admin",
      testMatch: "**/super-admin.project.spec.ts",
    },
    {
      name: "infra",
      testMatch: "**/infra/**/*.spec.ts",
    },
  ],
});
