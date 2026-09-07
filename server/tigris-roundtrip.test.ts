import { describe, expect, it } from "vitest";
import { objectStorageClientOptions, storageDeleteConfirmed, storageGet, storageInspect, storagePut } from "./storage";

const live = Boolean(objectStorageClientOptions());

describe.skipIf(!live)("homologação real Tigris PUT/HEAD/GET/DELETE", () => {
  it("completa o ciclo e confirma ausência após exclusão", async () => {
    const body = Buffer.from("oju-fase-05-probe");
    const put = await storagePut(`probes/fase05-${Date.now()}.txt`, body, "text/plain");
    expect(put.key).toBeTruthy();
    const head = await storageInspect(put.key);
    expect(head.status).toBe("present");
    const got = await storageGet(put.key);
    expect(got.key).toBe(put.key);
    const deleted = await storageDeleteConfirmed(put.key);
    expect(deleted.alreadyAbsent).toBe(false);
    const after = await storageInspect(put.key);
    expect(after.status).toBe("absent");
  }, 60000);
});

describe("homologação Tigris sem credenciais", () => {
  it("não falha a suíte quando S3_* está ausente", () => {
    if (!live) expect(objectStorageClientOptions()).toBeNull();
    else expect(objectStorageClientOptions()?.bucket).toBeTruthy();
  });
});
