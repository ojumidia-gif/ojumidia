import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

function parseEnvFile(raw: string) {
  const map = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    map.set(key, line.slice(eq + 1));
  }
  return map;
}

function inspectSecret(label: string, fileRaw: string | undefined, loaded: string | undefined) {
  const file = fileRaw ?? "";
  const env = loaded ?? "";
  return {
    label,
    fileChars: file.length,
    loadedChars: env.length,
    truncatedVsFile: file.length !== env.length,
    fileQuoted: (file.startsWith('"') && file.endsWith('"')) || (file.startsWith("'") && file.endsWith("'")),
    fileHasHash: file.includes("#"),
    fileHasDollar: file.includes("$"),
    fileHasPlus: file.includes("+"),
    fileHasSlash: file.includes("/"),
    fileHasEquals: file.includes("="),
    loadedHasSpace: /\s/.test(env),
    accessKeyLooksTigris: label.includes("ACCESS") ? (loaded || file).replace(/^["']|["']$/g, "").startsWith("tid_") : undefined,
  };
}

const file = parseEnvFile(readFileSync(resolve(process.cwd(), ".env"), "utf8"));
console.log(JSON.stringify({
  s3EndpointFileChars: (file.get("S3_ENDPOINT") ?? "").length,
  s3BucketFileChars: (file.get("S3_BUCKET") ?? "").length,
  access: inspectSecret("S3_ACCESS_KEY_ID", file.get("S3_ACCESS_KEY_ID"), process.env.S3_ACCESS_KEY_ID),
  secret: inspectSecret("S3_SECRET_ACCESS_KEY", file.get("S3_SECRET_ACCESS_KEY"), process.env.S3_SECRET_ACCESS_KEY),
}, null, 2));
