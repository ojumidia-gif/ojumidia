import "dotenv/config";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { objectStorageClientOptions, readObjectStorageEnv } from "../server/storage";

function present(name: string) {
  const raw = process.env[name];
  if (raw === undefined) return { set: false };
  const trimmed = raw.trim();
  const quoted = (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return {
    set: true,
    empty: trimmed.length === 0,
    length: trimmed.length,
    quoted,
    leadingOrTrailingSpace: raw !== raw.trim(),
    internalWhitespace: /\s/.test(trimmed) && name.includes("KEY"),
  };
}

function hostOf(url: string | undefined) {
  if (!url) return null;
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).host;
  } catch {
    return "invalid-url";
  }
}

async function main() {
  const env = readObjectStorageEnv();
  const options = objectStorageClientOptions();
  const s3 = present("S3_BUCKET");
  const tigris = present("TIGRIS_BUCKET");
  const bothEndpoints = Boolean(process.env.S3_ENDPOINT?.trim() && process.env.TIGRIS_ENDPOINT?.trim());
  const endpointsMatch = !bothEndpoints || process.env.S3_ENDPOINT?.trim() === process.env.TIGRIS_ENDPOINT?.trim();
  const bothKeys = Boolean(process.env.S3_ACCESS_KEY_ID?.trim() && process.env.TIGRIS_ACCESS_KEY_ID?.trim());
  const keysMatch = !bothKeys || process.env.S3_ACCESS_KEY_ID?.trim() === process.env.TIGRIS_ACCESS_KEY_ID?.trim();
  const diagnosis = {
    clockUtc: new Date().toISOString(),
    s3Bucket: s3,
    tigrisBucket: tigris,
    s3EndpointHost: hostOf(process.env.S3_ENDPOINT?.trim()),
    tigrisEndpointHost: hostOf(process.env.TIGRIS_ENDPOINT?.trim()),
    resolvedHost: hostOf(env.endpoint),
    resolvedRegion: env.region,
    forcePathStyle: env.forcePathStyle,
    tigrisLike: env.tigrisLike,
    awsRegionEnvSet: Boolean(process.env.AWS_REGION?.trim()),
    awsAccessKeyEnvSet: Boolean(process.env.AWS_ACCESS_KEY_ID?.trim()),
    bothEndpointsDiffer: bothEndpoints && !endpointsMatch,
    bothAccessKeysDiffer: bothKeys && !keysMatch,
    clientReady: Boolean(options),
    checksumMode: options?.clientConfig.requestChecksumCalculation ?? null,
    s3AccessKey: present("S3_ACCESS_KEY_ID"),
    s3Secret: present("S3_SECRET_ACCESS_KEY"),
    tigrisAccessKey: present("TIGRIS_ACCESS_KEY_ID"),
    tigrisSecret: present("TIGRIS_SECRET_ACCESS_KEY"),
  };
  console.log(JSON.stringify({ diagnosis }, null, 2));
  if (!options) {
    console.log(JSON.stringify({ probe: "skipped", reason: "client-not-ready" }));
    process.exit(1);
  }
  const client = new S3Client(options.clientConfig);
  const key = `homologation/tigris-probe-${Date.now()}.txt`;
  const payload = Buffer.from(`oju-tigris-probe-${Date.now()}`);
  await client.send(new PutObjectCommand({ Bucket: options.bucket, Key: key, Body: payload, ContentType: "text/plain", ContentLength: payload.length }));
  await client.send(new HeadObjectCommand({ Bucket: options.bucket, Key: key }));
  const got = await client.send(new GetObjectCommand({ Bucket: options.bucket, Key: key }));
  const body = Buffer.from(await got.Body!.transformToByteArray());
  const same = body.equals(payload);
  await client.send(new DeleteObjectCommand({ Bucket: options.bucket, Key: key }));
  console.log(JSON.stringify({ probe: { put: true, head: true, get: true, bytesMatch: same, deleted: true, keyPrefix: "homologation/tigris-probe-" } }));
  if (!same) process.exit(1);
}

main().catch(error => {
  const err = error as { name?: string; message?: string; Code?: string; $metadata?: { httpStatusCode?: number; requestId?: string } };
  console.log(JSON.stringify({
    probe: "failed",
    name: err.name || err.Code || "Error",
    message: (err.message || "").replace(/AKIA[A-Z0-9]+|tid_[A-Za-z0-9]+/g, "[redacted]"),
    httpStatus: err.$metadata?.httpStatusCode ?? null,
  }, null, 2));
  process.exit(1);
});
