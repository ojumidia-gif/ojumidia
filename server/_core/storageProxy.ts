import { createReadStream, existsSync } from "node:fs";
import type { Express, Request, Response } from "express";
import { isLocalDevelopmentStorage, resolveLocalStorageFile, storageGetSignedUrl } from "../storage";

async function serveStoredObject(key: string, res: Response) {
  if (!key) {
    res.status(400).send("Missing storage key");
    return;
  }

  try {
    if (isLocalDevelopmentStorage()) {
      const absolute = resolveLocalStorageFile(key);
      if (!existsSync(absolute)) {
        res.status(404).send("Arquivo não encontrado no storage local.");
        return;
      }
      res.set("Cache-Control", "private, max-age=60");
      createReadStream(absolute).pipe(res);
      return;
    }

    const url = await storageGetSignedUrl(key);
    res.set("Cache-Control", "no-store");
    res.redirect(307, url);
  } catch (err) {
    console.error("[StorageProxy] failed:", err);
    res.status(502).send("Storage proxy error");
  }
}

export function registerStorageProxy(app: Express) {
  const handler = async (req: Request, res: Response) => {
    const key = (req.params as Record<string, string>)[0];
    await serveStoredObject(key, res);
  };
  app.get("/media-storage/*", handler);
  app.get("/manus-storage/*", handler);
}
