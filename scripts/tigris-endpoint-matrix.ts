import "dotenv/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readObjectStorageEnv } from "../server/storage";

async function tryPut(label: string, endpoint: string, region: string, forcePathStyle: boolean, credentials: { accessKeyId: string; secretAccessKey: string }, bucket: string) {
  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `homologation/endpoint-matrix-${Date.now()}.txt`,
      Body: Buffer.from("x"),
      ContentType: "text/plain",
      ContentLength: 1,
    }));
    return { label, ok: true };
  } catch (error) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    return { label, ok: false, name: err.name, status: err.$metadata?.httpStatusCode ?? null };
  }
}

async function main() {
  const env = readObjectStorageEnv();
  if (!env.bucket || !env.accessKeyId || !env.secretAccessKey) throw new Error("storage env incomplete");
  const credentials = { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey };
  const endpoints = Array.from(new Set([
    env.endpoint!,
    "https://t3.storage.dev",
    "https://fly.storage.tigris.dev",
  ]));
  const results = [];
  for (const endpoint of endpoints) {
    results.push(await tryPut(`${new URL(endpoint).host}|auto|path`, endpoint, "auto", true, credentials, env.bucket));
    results.push(await tryPut(`${new URL(endpoint).host}|auto|virtual`, endpoint, "auto", false, credentials, env.bucket));
  }
  console.log(JSON.stringify({ configuredHost: new URL(env.endpoint!).host, results }, null, 2));
  if (!results.some(item => item.ok)) process.exit(1);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
