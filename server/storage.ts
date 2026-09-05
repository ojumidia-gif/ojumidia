// Object storage: Tigris (S3-compatible) in production, optional Forge, or
// local disk in development only. Public reads go through /media-storage/{key}
// with a temporary alias at /manus-storage/{key} for records already saved.

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { ENV } from "./_core/env";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage de produção ausente: configure Tigris (S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY).",
    );
  }

  return {
    forgeUrl: forgeUrl.replace(/\/+$/, ""),
    forgeKey,
  };
}

export const MEDIA_PUBLIC_PREFIX = "/media-storage";
export const MEDIA_LEGACY_PREFIX = "/manus-storage";

export function publicMediaUrl(key: string) {
  return `${MEDIA_PUBLIC_PREFIX}/${normalizeKey(key)}`;
}

export function isInternalMediaUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^\/(media-storage|manus-storage)\/[A-Za-z0-9._\-/]+$/.test(value);
}

export function readObjectStorageEnv() {
  const bucket =
    process.env.S3_BUCKET?.trim() ||
    process.env.TIGRIS_BUCKET?.trim();
  const endpoint =
    process.env.S3_ENDPOINT?.trim() ||
    process.env.TIGRIS_ENDPOINT?.trim();
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID?.trim() ||
    process.env.TIGRIS_ACCESS_KEY_ID?.trim() ||
    process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY?.trim() ||
    process.env.TIGRIS_SECRET_ACCESS_KEY?.trim() ||
    process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const tigrisLike = Boolean(endpoint && /tigris|storage\.dev/i.test(endpoint));
  const region =
    process.env.S3_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    (endpoint ? "auto" : "");
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true" ? true : tigrisLike ? false : Boolean(endpoint);

  return { bucket, endpoint, accessKeyId, secretAccessKey, region, forcePathStyle, tigrisLike };
}

export function objectStorageClientOptions() {
  const env = readObjectStorageEnv();
  if (!env.bucket || !env.accessKeyId || !env.secretAccessKey || !env.region) return null;
  return {
    bucket: env.bucket,
    tigrisLike: env.tigrisLike,
    clientConfig: {
      region: env.region,
      endpoint: env.endpoint || undefined,
      forcePathStyle: env.forcePathStyle,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED" as const,
      responseChecksumValidation: "WHEN_REQUIRED" as const,
    },
  };
}

function getExternalS3Config() {
  const options = objectStorageClientOptions();
  if (!options) return null;
  return {
    bucket: options.bucket,
    client: new S3Client(options.clientConfig),
  };
}

export function getLocalStorageDir(): string | null {
  if (ENV.isProduction) return null;
  if (process.env.LOCAL_STORAGE_ENABLED === "false") return null;
  const configured = process.env.LOCAL_STORAGE_DIR?.trim();
  return resolve(process.cwd(), configured || ".local-storage");
}

export function isLocalDevelopmentStorage() {
  return Boolean(getLocalStorageDir()) && !getExternalS3Config() && !(ENV.forgeApiUrl && ENV.forgeApiKey);
}

function localStoragePath(key: string) {
  const root = getLocalStorageDir();
  if (!root) throw new Error("Storage local de desenvolvimento não está disponível.");
  const normalized = normalizeKey(key).replace(/\\/g, "/");
  if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
    throw new Error("Chave de storage inválida.");
  }
  const absolute = resolve(root, normalized);
  const rootWithSep = root.endsWith(sep) ? root : `${root}${sep}`;
  if (absolute !== root && !absolute.startsWith(rootWithSep)) {
    throw new Error("Chave de storage inválida.");
  }
  return absolute;
}

export function resolveLocalStorageFile(relKey: string) {
  return localStoragePath(relKey);
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");

  return lastDot === -1
    ? `${relKey}_${hash}`
    : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export function hasStorageConfiguration() {
  return Boolean(
    (ENV.forgeApiUrl && ENV.forgeApiKey) || getExternalS3Config() || isLocalDevelopmentStorage(),
  );
}

export function describeStorageConfiguration() {
  if (getExternalS3Config()) {
    const options = objectStorageClientOptions();
    return options?.tigrisLike ? "tigris" : "s3";
  }
  if (ENV.forgeApiUrl && ENV.forgeApiKey) return "forge";
  if (isLocalDevelopmentStorage()) return "local-development";
  return "missing";
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const externalS3 = getExternalS3Config();

  if (isLocalDevelopmentStorage()) {
    const absolute = localStoragePath(key);
    await mkdir(dirname(absolute), { recursive: true });
    const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
    await writeFile(absolute, buffer);
    return {
      key,
      url: publicMediaUrl(key),
    };
  }

  if (externalS3) {
    await externalS3.client.send(
      new PutObjectCommand({
        Bucket: externalS3.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );

    return {
      key,
      url: publicMediaUrl(key),
    };
  }

  const { forgeUrl, forgeKey } = getForgeConfig();

  const presignUrl = new URL(
    "v1/storage/presign/put",
    `${forgeUrl}/`,
  );

  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: {
      Authorization: `Bearer ${forgeKey}`,
    },
  });

  if (!presignResp.ok) {
    throw new Error(
      `Storage presign failed (${presignResp.status}): ${await presignResp
        .text()
        .catch(() => presignResp.statusText)}`,
    );
  }

  const { url: s3Url } = (await presignResp.json()) as {
    url: string;
  };

  if (!s3Url) {
    throw new Error("Forge returned empty presign URL");
  }

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as BufferSource], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(
      `Storage upload to S3 failed (${uploadResp.status})`,
    );
  }

  return {
    key,
    url: publicMediaUrl(key),
  };
}

export async function storageGet(
  relKey: string,
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  return {
    key,
    url: publicMediaUrl(key),
  };
}

export async function storageGetSignedUrl(
  relKey: string,
): Promise<string> {
  const key = normalizeKey(relKey);
  if (isLocalDevelopmentStorage()) {
    localStoragePath(key);
    return publicMediaUrl(key);
  }
  const externalS3 = getExternalS3Config();

  if (externalS3) {
    return getSignedUrl(
      externalS3.client,
      new GetObjectCommand({
        Bucket: externalS3.bucket,
        Key: key,
      }),
      {
        expiresIn: 60 * 10,
      },
    );
  }

  const { forgeUrl, forgeKey } = getForgeConfig();

  const getUrl = new URL(
    "v1/storage/presign/get",
    `${forgeUrl}/`,
  );

  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${forgeKey}`,
    },
  });

  if (!resp.ok) {
    throw new Error(
      `Storage signed URL failed (${resp.status}): ${await resp
        .text()
        .catch(() => resp.statusText)}`,
    );
  }

  const { url } = (await resp.json()) as {
    url: string;
  };

  if (!url) {
    throw new Error("Forge returned empty presign URL");
  }

  return url;
}

/**
 * Permanently removes an object from the physical Storage.
 *
 * External S3-compatible deployments use the native DeleteObject
 * operation. The managed Forge storage currently exposes only the
 * presign PUT/GET operations used by this application, so we fail
 * explicitly instead of reporting a successful deletion that did
 * not actually happen.
 */
export async function storageDelete(relKey: string): Promise<void> {
  const key = normalizeKey(relKey);

  if (!key) {
    return;
  }

  if (isLocalDevelopmentStorage()) {
    await unlink(localStoragePath(key)).catch(() => undefined);
    return;
  }

  const externalS3 = getExternalS3Config();

  if (externalS3) {
    await externalS3.client.send(
      new DeleteObjectCommand({
        Bucket: externalS3.bucket,
        Key: key,
      }),
    );

    return;
  }

  throw new Error(
    `Physical Storage deletion is not configured for Forge storage. Key: ${key}`,
  );
}