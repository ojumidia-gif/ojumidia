import type { Express, Request, Response } from "express";
import express from "express";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { applyPaymentWebhook } from "./networkPayments";

export function registerPaymentWebhookRoute(app: Express) {
  app.post("/api/payments/webhook", express.raw({ type: "application/json", limit: "64kb" }), async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    const signature = String(req.header("x-oju-payment-signature") || "");
    const timestamp = String(req.header("x-oju-payment-timestamp") || "");
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "database_unavailable" });
      const result = await applyPaymentWebhook(db, { rawBody, signature, timestamp });
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof TRPCError) {
        const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json({ error: "webhook_rejected" });
      }
      const message = error instanceof Error ? error.message : "webhook_rejected";
      const status = message.includes("Assinatura") || message.includes("PAYMENT_WEBHOOK") ? 401 : 400;
      console.warn("[payments.webhook]", message);
      return res.status(status).json({ error: "webhook_rejected" });
    }
  });
}
