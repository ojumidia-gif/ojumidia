import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
export function localDevAuthEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.OJU_LOCAL_DEV_LOGIN_ENABLED === "true" &&
    Boolean(process.env.OJU_LOCAL_ADMIN_EMAIL?.trim())
  );
}

export function registerLocalDevAuthRoutes(app: Express) {
  app.get("/api/local-dev/status", (_req, res) => {
    if (process.env.NODE_ENV !== "development") return res.sendStatus(404);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ enabled: localDevAuthEnabled(), automatic: localDevAuthEnabled() });
  });

  app.post("/api/local-dev/login", async (req: Request, res: Response) => {
    if (!localDevAuthEnabled()) return res.sendStatus(404);
    res.setHeader("Cache-Control", "no-store");

    const email = process.env.OJU_LOCAL_ADMIN_EMAIL!.trim().toLowerCase();
    const openId = `local-dev-${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
    try {
      await db.upsertUser({
        openId,
        name: "Administrador local de desenvolvimento",
        email,
        loginMethod: "local-development",
        lastSignedIn: new Date(),
      });

      const token = await sdk.signSession(
        { openId, name: "Administrador local de desenvolvimento" },
        { expiresInMs: SESSION_DURATION_MS }
      );
      res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: SESSION_DURATION_MS });
      return res.status(204).end();
    } catch {
      return res.status(503).json({ message: "O ambiente local não está pronto para autenticação." });
    }
  });
}
