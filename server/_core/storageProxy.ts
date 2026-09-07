import { createReadStream, existsSync } from "node:fs";
import type { Express, Request, Response } from "express";
import { authorizeStorageKeyAccess, isUnsafeStorageKey } from "../mediaAccess";
import { getDb } from "../db";
import { isLocalDevelopmentStorage, resolveLocalStorageFile, storageGetSignedUrl } from "../storage";
import { sdk } from "./sdk";

async function optionalUser(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

async function serveStoredObject(key: string, req: Request, res: Response) {
  if (!key || isUnsafeStorageKey(key)) {
    res.status(400).send("Missing storage key");
    return;
  }

  const db = await getDb();
  if (!db) {
    res.status(503).send("Banco indisponível para autorizar o arquivo.");
    return;
  }
  const actor = await optionalUser(req);
  const access = await authorizeStorageKeyAccess(db, key, actor);
  if (access === "deny") {
    res.status(404).send("Arquivo não encontrado.");
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
    await serveStoredObject(key, req, res);
  };
  app.get("/media-storage/*", handler);
  app.get("/manus-storage/*", handler);
}
