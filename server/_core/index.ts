import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { parseBuffer } from "music-metadata";
import { eq, sql } from "drizzle-orm";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { MAX_MINICLIP_DURATION_SECONDS } from "@shared/const";
import { describeStorageConfiguration, getLocalStorageDir, hasStorageConfiguration, storagePut } from "../storage";
import { sdk } from "./sdk";
import { openEditorialEventStream } from "../editorialEvents";
import { registerLocalDevAuthRoutes } from "./localDevAuth";
import { registerPrivateCommercialFilesRoute } from "../privateCommercialFiles";
import { registerPaymentWebhookRoute } from "../paymentWebhook";
import { getDb } from "../db";
import { uploadSessions } from "../../drizzle/schema";
import { recordAuditEvent, resolveAuthenticatedScope } from "../partnerScope";
import { runProductionMaintenanceJobs } from "../editorialJobs";
import { getAuthRuntimeStatus } from "./authStatus";
import { classifyUploadFile } from "../uploadGuards";
import { enforceUploadBudget } from "../uploadBudget";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
    if (_req.path.startsWith("/admin") || _req.path.startsWith("/api")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }
    next();
  });
  registerPaymentWebhookRoute(app);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  app.use("/oju-assets", express.static(resolve(process.cwd(), "firebase-assets"), { maxAge: "1d", immutable: false }));
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.get("/ready", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ status: "unavailable", dependency: "database" });
      await db.execute(sql`SELECT 1`);
      return res.status(200).json({ status: "ready" });
    } catch {
      return res.status(503).json({ status: "unavailable", dependency: "database" });
    }
  });
  app.use("/api", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const isCronWithBearer = req.path === "/scheduled/editorial-trash-purge" && /^Bearer\s+\S+$/i.test(req.header("authorization") || "");
    const isPaymentWebhook = req.path === "/payments/webhook";
    if (isCronWithBearer || isPaymentWebhook) return next();
    const origin = req.header("origin");
    const host = req.header("host");
    try {
      if (!origin || !host || new URL(origin).host !== host) {
        return res.status(403).json({ error: "cross_origin_mutation_forbidden" });
      }
    } catch {
      return res.status(403).json({ error: "cross_origin_mutation_forbidden" });
    }
    return next();
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerLocalDevAuthRoutes(app);
  registerPrivateCommercialFilesRoute(app);
  app.get("/api/auth/status", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    return res.json(getAuthRuntimeStatus());
  });
  app.post("/api/scheduled/editorial-trash-purge", async (req, res) => {
    try {
      const configuredSecret = process.env.EDITORIAL_TRASH_CRON_SECRET;
      const receivedToken = req.header("authorization")?.replace(/^Bearer\s+/i, "") || "";
      const validSecret = configuredSecret
        ? receivedToken.length === configuredSecret.length && timingSafeEqual(Buffer.from(receivedToken), Buffer.from(configuredSecret))
        : false;
      const user = validSecret ? null : await sdk.authenticateRequest(req);
      if (!validSecret && !(user as typeof user & { isCron?: boolean } | null)?.isCron) return res.status(403).json({ error: "cron-only" });
      const result = await runProductionMaintenanceJobs();
      if (!result.ok) return res.status(503).json({ error: result.error });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida ao expurgar a Lixeira Editorial.";
      console.error("[EditorialTrashPurge]", error);
      return res.status(500).json({ error: message, context: { path: "/api/scheduled/editorial-trash-purge" }, timestamp: new Date().toISOString() });
    }
  });
  app.get("/api/editorial/events", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!["editor", "aprovador", "administrador", "administrador principal"].includes(user.role)) {
        return res.status(403).json({ error: "sse_forbidden" });
      }
    } catch {
      return res.status(401).json({ error: "sse_auth" });
    }
    openEditorialEventStream(res, req);
  });
  app.post("/api/media/upload", express.raw({ type: ["image/*", "video/*", "audio/*", "application/pdf", "application/octet-stream"], limit: "64mb" }), async (req, res) => {
    let uploadId: string | null = null;
    let db: NonNullable<Awaited<ReturnType<typeof getDb>>> | null = null;
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        return res.status(401).json({ message: "Faça login para enviar arquivos." });
      }
      if (!["criador", "editor", "aprovador", "administrador", "administrador principal"].includes(user.role)) {
        return res.status(403).json({ message: "Seu perfil não possui permissão para enviar mídia." });
      }
      const filename = String(req.header("x-file-name") || "arquivo").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180);
      const contentType = req.header("content-type") || "application/octet-stream";
      if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ message: "Selecione um arquivo válido." });
      const classified = classifyUploadFile(contentType, req.body);
      if ("error" in classified) return res.status(415).json({ message: classified.error });
      const requestedUploadId = String(req.header("x-upload-id") || "").trim();
      if (requestedUploadId && !/^[a-zA-Z0-9_-]{12,96}$/.test(requestedUploadId)) return res.status(400).json({ message: "O identificador de upload é inválido." });
      uploadId = requestedUploadId || randomUUID();
      const partnerHeader = String(req.header("x-partner-id") || "").trim();
      const territoryHeader = String(req.header("x-territory-id") || "").trim();
      const requestedPartnerId = partnerHeader ? Number(partnerHeader) : null;
      const requestedTerritoryId = territoryHeader ? Number(territoryHeader) : null;
      if ((partnerHeader && (!Number.isInteger(requestedPartnerId) || requestedPartnerId! <= 0)) || (territoryHeader && (!Number.isInteger(requestedTerritoryId) || requestedTerritoryId! <= 0))) return res.status(400).json({ message: "O contexto territorial do upload é inválido." });
      db = await getDb();
      if (!db) return res.status(503).json({ message: "Banco de dados indisponível para registrar o upload." });
      if (!hasStorageConfiguration()) {
        return res.status(503).json({
          message: process.env.NODE_ENV === "production"
            ? "Storage de produção ausente. Configure Tigris (S3_BUCKET, S3_ENDPOINT e chaves) no ambiente."
            : "Storage ausente. Configure S3/Forge ou use o armazenamento local de desenvolvimento (.local-storage).",
        });
      }
      let partnerId: number | null = null;
      let territoryId: number | null = null;
      try {
        const scope = await resolveAuthenticatedScope({ db, actor: user, requestedPartnerId, requestedTerritoryId, resourceLabel: "este upload" });
        partnerId = scope.partnerId;
        territoryId = scope.territoryId;
      } catch (error) {
        return res.status(403).json({ message: error instanceof Error ? error.message : "Você não possui escopo para este upload." });
      }
      const budget = await enforceUploadBudget(db, user.id, req.body.length);
      if (!budget.ok) return res.status(budget.status).json({ message: budget.message });
      const checksum = createHash("sha256").update(req.body).digest("hex");
      const existing = (await db.select().from(uploadSessions).where(eq(uploadSessions.id, uploadId)).limit(1))[0];
      if (existing) {
        if (existing.userId !== user.id) return res.status(403).json({ message: "Este identificador de upload pertence a outro usuário." });
        if (["Pronto", "Aprovado", "Publicado"].includes(existing.status) && existing.assetUrl && existing.storageKey) return res.status(200).json({ uploadId, url: existing.assetUrl, key: existing.storageKey, assetUrl: existing.assetUrl, storageKey: existing.storageKey, filename: existing.filename, size: existing.fileSize, durationSeconds: existing.durationSeconds, checksum: existing.checksum, status: existing.status, reused: true });
        if (["Enviando", "Enviado", "Processando"].includes(existing.status)) return res.status(409).json({ message: "Este upload já está em processamento. Aguarde a conclusão antes de tentar novamente.", uploadId });
        await db.update(uploadSessions).set({ status: "Enviando", partnerId, territoryId, filename, contentType, checksum, errorMessage: null, assetUrl: null, storageKey: null, fileSize: null, durationSeconds: null, completedAt: null, attemptCount: existing.attemptCount + 1, rejectedBy: null, rejectedAt: null, cancelledAt: null }).where(eq(uploadSessions.id, uploadId));
      } else {
        const mediaType = classified.kind === "foto" ? "foto" : classified.kind === "vídeo" ? "vídeo" : "documento";
        await db.insert(uploadSessions).values({ id: uploadId, userId: user.id, partnerId, territoryId, mediaType, status: "Enviando", filename, contentType, checksum, attemptCount: 1 });
      }
      let durationSeconds: number | undefined;
      if (contentType.toLowerCase().startsWith("video/")) {
        try {
          await db.update(uploadSessions).set({ status: "Enviado" }).where(eq(uploadSessions.id, uploadId));
          const metadata = await parseBuffer(req.body, { mimeType: contentType });
          const duration = metadata.format.duration;
          if (!Number.isFinite(duration) || !duration || duration < 1) return res.status(400).json({ message: "Não foi possível confirmar a duração real do vídeo." });
          durationSeconds = Math.ceil(duration);
          if (durationSeconds > MAX_MINICLIP_DURATION_SECONDS) return res.status(400).json({ message: "O vídeo ultrapassa o máximo absoluto de 60 segundos." });
        } catch {
          return res.status(400).json({ message: "Não foi possível inspecionar a duração real do vídeo. Envie um arquivo de vídeo válido." });
        }
      }
      await db.update(uploadSessions).set({ status: "Processando" }).where(eq(uploadSessions.id, uploadId));
      const uploaded = await storagePut(`media/${user.id}/${uploadId}-${filename}`, req.body, contentType);
      await db.update(uploadSessions).set({ status: "Pronto", storageKey: uploaded.key, assetUrl: uploaded.url, fileSize: req.body.length, durationSeconds: durationSeconds ?? null, completedAt: new Date() }).where(eq(uploadSessions.id, uploadId));
      await recordAuditEvent(db, { actorId: user.id, partnerId, territoryId, resourceType: "upload-session", resourceId: null, action: "upload-ready", nextState: { uploadId, status: "Pronto", filename, checksum, size: req.body.length, quotaAlert: budget.alert }, detail: "Arquivo enviado ao storage e pronto para registro no Acervo; nenhuma publicação foi criada." });
      console.info("[MediaUpload]", JSON.stringify({ event: "upload-ready", userId: user.id, size: req.body.length, kind: classified.kind, quotaAlert: budget.alert }));
      return res.status(201).json({ ...uploaded, url: uploaded.url, key: uploaded.key, assetUrl: uploaded.url, storageKey: uploaded.key, uploadId, filename, size: req.body.length, durationSeconds, checksum, status: "Pronto", quotaAlert: budget.alert });
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 400) : "Falha desconhecida no upload.";
      if (db && uploadId) await db.update(uploadSessions).set({ status: "Falhou", errorMessage: detail.slice(0, 4000) }).where(eq(uploadSessions.id, uploadId)).catch(() => undefined);
      console.error("[MediaUpload]", error);
      return res.status(500).json({ message: `Não foi possível enviar o arquivo. ${detail}` });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  app.use("/api", (_req, res) => res.status(404).json({ error: "api_not_found" }));
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const configuredPort = Number.parseInt(process.env.PORT || "3000", 10);
  const port = process.env.PORT ? configuredPort : await findAvailablePort(configuredPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT deve ser um número válido entre 1 e 65535.");
  server.listen(port, "0.0.0.0", () => {
    const runtime = process.env.NODE_ENV || "development";
    const authStatus = getAuthRuntimeStatus();
    const storageKind = describeStorageConfiguration();
    console.info(`[Runtime] Ojú Mídia iniciado em modo ${runtime}; porta ${port}; login ${authStatus.loginMode}; storage ${storageKind}.`);
    if (!authStatus.googleOAuth) console.info(`[OAuth] ${authStatus.message}`);
    if (storageKind === "local-development") {
      console.info(`[Storage] Arquivos deste ambiente vão para ${getLocalStorageDir()}. Isso não é persistência de produção.`);
    }
    if (storageKind === "missing") console.warn("[Storage] Nenhum storage configurado. Em produção use Tigris (S3_*). Em desenvolvimento, .local-storage entra automaticamente.");
    const maintenanceMs = 15 * 60 * 1000;
    setInterval(() => {
      runProductionMaintenanceJobs().then(result => {
        console.info("[EditorialJobs]", JSON.stringify({ event: "maintenance", ok: result.ok, skipped: "skipped" in result ? result.skipped : false }));
      }).catch(error => console.error("[EditorialJobs]", error instanceof Error ? error.message : "falha"));
    }, maintenanceMs).unref();
  });
  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch(console.error);
