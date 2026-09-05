import "dotenv/config";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readObjectStorageEnv } from "../server/storage";

async function tryPut(label: string, clientConfig: ConstructorParameters<typeof S3Client>[0], bucket: string) {
  const client = new S3Client(clientConfig);
  const key = `homologation/sig-matrix-${Date.now()}.txt`;
  const payload = Buffer.from("oju-sig-matrix");
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: payload, ContentType: "text/plain", ContentLength: payload.length }));
    const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = Buffer.from(await got.Body!.transformToByteArray());
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return { label, ok: true, match: body.equals(payload) };
  } catch (error) {
    const err = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
    return { label, ok: false, name: err.name, status: err.$metadata?.httpStatusCode ?? null };
  }
}

async function main() {
  const env = readObjectStorageEnv();
  if (!env.bucket || !env.endpoint || !env.accessKeyId || !env.secretAccessKey) throw new Error("storage env incomplete");
  const credentials = { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey };
  const checksum = { requestChecksumCalculation: "WHEN_REQUIRED" as const, responseChecksumValidation: "WHEN_REQUIRED" as const };
  const results = [];
  for (const region of ["auto", "us-east-1"]) {
    for (const forcePathStyle of [false, true]) {
      results.push(await tryPut(`region=${region};pathStyle=${forcePathStyle}`, {
        region,
        endpoint: env.endpoint,
        forcePathStyle,
        credentials,
        ...checksum,
      }, env.bucket));
    }
  }
  console.log(JSON.stringify({ host: new URL(env.endpoint).host, results }, null, 2));
  if (!results.some(item => item.ok)) process.exit(1);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
