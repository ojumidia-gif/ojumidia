/**
 * Abre o Google Chrome do operador com debug CDP, perfil isolado, sem flags
 * de automação do Playwright. O Google recusa Chromium/Chrome lançado pelo
 * Playwright (--enable-automation / navigator.webdriver).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

const qaPath = resolve(process.cwd(), ".env.qa");
if (existsSync(qaPath)) {
  const qa = parse(readFileSync(qaPath));
  for (const key of ["E2E_AUTH_CDP_PORT", "QA_CHROME_PROFILE", "CHROME_PATH"] as const) {
    if (qa[key]?.trim() && !process.env[key]?.trim()) process.env[key] = qa[key];
  }
}

const port = process.env.E2E_AUTH_CDP_PORT || "9222";
const profile = resolve(process.cwd(), process.env.QA_CHROME_PROFILE || ".qa-chrome-profile");
mkdirSync(profile, { recursive: true });

const candidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA ? resolve(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe") : "",
].filter(Boolean) as string[];

const chrome = candidates.find(path => existsSync(path));
if (!chrome) {
  throw new Error(
    "Chrome não encontrado. Defina CHROME_PATH ou instale o Google Chrome. Não use o Chromium do Playwright para o login Google.",
  );
}

const child = spawn(
  chrome,
  [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate",
  ],
  { detached: true, stdio: "ignore" },
);
child.unref();

console.log(`Chrome CDP em http://127.0.0.1:${port}`);
console.log(`Perfil isolado (gitignored): ${profile}`);
console.log("Super Admin: $env:E2E_AUTH_CAPTURE='1'; $env:E2E_AUTH_PERSONA='super-admin'; pnpm test:e2e:auth");
console.log("Participante: mesma captura com E2E_AUTH_PERSONA=professional, conta distinta do Super Admin.");
console.log("Complete o Google nessa janela do Chrome — não na do Playwright.");
