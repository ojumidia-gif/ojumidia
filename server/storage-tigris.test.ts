import { describe, expect, it } from "vitest";
import { isInternalMediaUrl, MEDIA_LEGACY_PREFIX, MEDIA_PUBLIC_PREFIX, objectStorageClientOptions, publicMediaUrl, readObjectStorageEnv } from "./storage";

describe("adapter de objeto para Tigris/S3", () => {
  it("gera URL pública neutra e reconhece o alias legado", () => {
    expect(publicMediaUrl("media/1/file.jpg")).toBe("/media-storage/media/1/file.jpg");
    expect(MEDIA_PUBLIC_PREFIX).toBe("/media-storage");
    expect(MEDIA_LEGACY_PREFIX).toBe("/manus-storage");
    expect(isInternalMediaUrl("/media-storage/abc.jpg")).toBe(true);
    expect(isInternalMediaUrl("/manus-storage/abc.jpg")).toBe(true);
    expect(isInternalMediaUrl("https://cdn.example/x.jpg")).toBe(true);
  });

  it("aceita Tigris sem S3_REGION explícita e desliga checksum automático do SDK", () => {
    const previous = { ...process.env };
    process.env.S3_BUCKET = "oju-media";
    process.env.S3_ENDPOINT = "https://fly.storage.tigris.dev";
    process.env.S3_ACCESS_KEY_ID = "tid";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    delete process.env.S3_REGION;
    delete process.env.AWS_REGION;
    try {
      const env = readObjectStorageEnv();
      expect(env.region).toBe("auto");
      expect(env.tigrisLike).toBe(true);
      expect(env.forcePathStyle).toBe(false);
      const options = objectStorageClientOptions();
      expect(options?.clientConfig.requestChecksumCalculation).toBe("WHEN_REQUIRED");
      expect(options?.clientConfig.responseChecksumValidation).toBe("WHEN_REQUIRED");
    } finally {
      process.env.S3_BUCKET = previous.S3_BUCKET;
      process.env.S3_ENDPOINT = previous.S3_ENDPOINT;
      process.env.S3_ACCESS_KEY_ID = previous.S3_ACCESS_KEY_ID;
      process.env.S3_SECRET_ACCESS_KEY = previous.S3_SECRET_ACCESS_KEY;
      process.env.S3_REGION = previous.S3_REGION;
      process.env.AWS_REGION = previous.AWS_REGION;
    }
  });

  it("aceita aliases TIGRIS_* quando S3_* não está preenchido", () => {
    const previous = { ...process.env };
    delete process.env.S3_BUCKET;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.S3_REGION;
    delete process.env.AWS_REGION;
    process.env.TIGRIS_BUCKET = "oju-media";
    process.env.TIGRIS_ENDPOINT = "https://t3.storage.dev";
    process.env.TIGRIS_ACCESS_KEY_ID = "tid";
    process.env.TIGRIS_SECRET_ACCESS_KEY = "secret";
    try {
      const env = readObjectStorageEnv();
      expect(env.bucket).toBe("oju-media");
      expect(env.tigrisLike).toBe(true);
      expect(env.region).toBe("auto");
      expect(objectStorageClientOptions()?.bucket).toBe("oju-media");
    } finally {
      process.env.S3_BUCKET = previous.S3_BUCKET;
      process.env.S3_ENDPOINT = previous.S3_ENDPOINT;
      process.env.S3_ACCESS_KEY_ID = previous.S3_ACCESS_KEY_ID;
      process.env.S3_SECRET_ACCESS_KEY = previous.S3_SECRET_ACCESS_KEY;
      process.env.TIGRIS_BUCKET = previous.TIGRIS_BUCKET;
      process.env.TIGRIS_ENDPOINT = previous.TIGRIS_ENDPOINT;
      process.env.TIGRIS_ACCESS_KEY_ID = previous.TIGRIS_ACCESS_KEY_ID;
      process.env.TIGRIS_SECRET_ACCESS_KEY = previous.TIGRIS_SECRET_ACCESS_KEY;
    }
  });

  it("não envia objeto real ao Tigris nesta suíte", () => {
    expect(process.env.OJU_TIGRIS_LIVE_TEST).not.toBe("true");
  });
});
