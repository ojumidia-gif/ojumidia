import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const projectRoot = resolve(import.meta.dirname, "..");
const viteBinary = resolve(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vite.cmd" : "vite"
);
const result = spawnSync(viteBinary, ["build", "--mode", "firebase-preview"], {
  cwd: projectRoot,
  env: { ...process.env, VITE_OJU_STATIC_PREVIEW: "true" },
  stdio: "inherit",
  shell: process.platform === "win32",
  windowsHide: true,
});

if (result.status !== 0) process.exit(result.status ?? 1);

const assets = spawnSync(process.execPath, [resolve(import.meta.dirname, "prepare-firebase-preview-assets.mjs")], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

process.exit(assets.status ?? 1);
