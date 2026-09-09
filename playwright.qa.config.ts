import { defineConfig, devices } from "@playwright/test";
import { playwrightQaWebServerEnv } from "./e2e/lib/qaPlaywrightEnv";

const qaEnv = playwrightQaWebServerEnv();
Object.assign(process.env, qaEnv);

const e2ePort = qaEnv.E2E_PORT || "3100";
const baseURL = qaEnv.E2E_BASE_URL || `http://127.0.0.1:${e2ePort}`;

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
  webServer: {
    command: "pnpm exec cross-env NODE_ENV=development tsx server/_core/index.ts",
    url: `${baseURL}/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: qaEnv,
  },
  projects: [
    { name: "infra", testMatch: "**/infra/**/*.spec.ts" },
    { name: "super-admin", testMatch: ["**/super-admin.smoke.spec.ts", "**/auth.authenticated.spec.ts"] },
    {
      name: "auth-capture",
      testMatch: "**/auth.capture.ts",
      timeout: 300_000,
    },
    {
      name: "journeys-visitor",
      testMatch: ["**/journeys/visitor/**/*.spec.ts"],
      timeout: 180_000,
    },
    {
      name: "journeys-security",
      testMatch: "**/journeys/security/**/*.spec.ts",
      timeout: 90_000,
    },
    {
      name: "journeys-admin",
      testMatch: ["**/journeys/admin/**/*.spec.ts"],
      timeout: 240_000,
    },
    {
      name: "rede-journey",
      testMatch: "**/rede.journey.spec.ts",
      timeout: 420_000,
    },
    {
      name: "journeys-identity",
      testMatch: "**/journeys/identity/**/*.spec.ts",
    },
    {
      name: "journeys-commercial",
      testMatch: ["**/journeys/commercial/**/*.spec.ts"],
      timeout: 420_000,
    },
  ],
});
