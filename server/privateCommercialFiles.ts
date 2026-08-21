import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { authorizationTerms, commercialRequests } from "../drizzle/schema";
import { getDb } from "./db";
import { storageGetSignedUrl } from "./storage";
import { sdk } from "./_core/sdk";

function canAccessCommercialFile(role: string, userId: number, ownerId: number | null) {
  return role === "administrador principal" || (role === "administrador" && ownerId === userId);
}

export function registerPrivateCommercialFilesRoute(app: Express) {
  app.get("/api/commercial/authorization-terms/:termId/document", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user || !["administrador", "administrador principal"].includes(user.role)) return res.status(401).json({ message: "Acesso administrativo necessário." });
      const termId = Number(req.params.termId);
      if (!Number.isInteger(termId) || termId <= 0) return res.status(400).json({ message: "Termo inválido." });
      const db = await getDb();
      if (!db) return res.status(503).json({ message: "Banco indisponível." });
      const record = (await db.select({ storageKey: authorizationTerms.signedStorageKey, filename: authorizationTerms.signedFilename, status: authorizationTerms.status, ownerId: commercialRequests.managedByUserId }).from(authorizationTerms).innerJoin(commercialRequests, eq(authorizationTerms.requestId, commercialRequests.id)).where(and(eq(authorizationTerms.id, termId), eq(authorizationTerms.status, "Assinado via gov.br"))).limit(1))[0];
      if (!record?.storageKey || !canAccessCommercialFile(user.role, user.id, record.ownerId)) return res.status(403).json({ message: "Você não possui acesso a este termo." });
      const signedUrl = await storageGetSignedUrl(record.storageKey);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Disposition", `inline; filename="${(record.filename || "termo-assinado.pdf").replace(/[\r\n"]/g, "-")}"`);
      return res.redirect(302, signedUrl);
    } catch (error) {
      console.error("[PrivateCommercialFile]", error);
      return res.status(500).json({ message: "Não foi possível abrir o documento protegido." });
    }
  });

  app.get("/api/governance/administrator-responsibility-terms/:termId/document", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user || !["administrador", "administrador principal"].includes(user.role)) return res.status(401).json({ message: "Acesso administrativo necessário." });
      const termId = Number(req.params.termId);
      if (!Number.isInteger(termId) || termId <= 0) return res.status(400).json({ message: "Termo inválido." });
      const db = await getDb();
      if (!db) return res.status(503).json({ message: "Banco indisponível." });
      const { administratorResponsibilityTerms } = await import("../drizzle/schema");
      const record = (await db.select({ storageKey: administratorResponsibilityTerms.signedStorageKey, filename: administratorResponsibilityTerms.signedFilename, email: administratorResponsibilityTerms.email }).from(administratorResponsibilityTerms).where(and(eq(administratorResponsibilityTerms.id, termId), eq(administratorResponsibilityTerms.status, "Assinado via gov.br"))).limit(1))[0];
      const sameAdministrator = user.role === "administrador" && user.email?.trim().toLowerCase() === record?.email.trim().toLowerCase();
      if (!record?.storageKey || !(user.role === "administrador principal" || sameAdministrator)) return res.status(403).json({ message: "Você não possui acesso a este termo." });
      const signedUrl = await storageGetSignedUrl(record.storageKey);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Disposition", `inline; filename="${(record.filename || "termo-responsabilidade.pdf").replace(/[\r\n"]/g, "-")}"`);
      return res.redirect(302, signedUrl);
    } catch (error) {
      console.error("[PrivateResponsibilityTerm]", error);
      return res.status(500).json({ message: "Não foi possível abrir o termo protegido." });
    }
  });
}
