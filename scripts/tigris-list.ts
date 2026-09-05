import "dotenv/config";
import { ListBucketsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { objectStorageClientOptions } from "../server/storage";

async function main() {
  const options = objectStorageClientOptions();
  if (!options) throw new Error("client-not-ready");
  const client = new S3Client(options.clientConfig);
  try {
    const buckets = await client.send(new ListBucketsCommand({}));
    console.log(JSON.stringify({ listBuckets: true, count: buckets.Buckets?.length ?? 0 }));
  } catch (error) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    console.log(JSON.stringify({ listBuckets: false, name: err.name, status: err.$metadata?.httpStatusCode ?? null }));
  }
  try {
    const objects = await client.send(new ListObjectsV2Command({ Bucket: options.bucket, MaxKeys: 1 }));
    console.log(JSON.stringify({ listObjects: true, keyCount: objects.KeyCount ?? 0 }));
  } catch (error) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    console.log(JSON.stringify({ listObjects: false, name: err.name, status: err.$metadata?.httpStatusCode ?? null }));
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
