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
import { storagePut } from "../storage";
import { sdk } from "./sdk";
import { openEditorialEventStream } from "../editorialEvents";
import { registerLocalDevAuthRoutes } from "./localDevAuth";
import { registerPrivateCommercialFilesRoute } from "../privateCommercialFiles";
import { getDb } from "../db";
import { uploadSessions } from "../../drizzle/schema";
import { assertPartnerScope, recordAuditEvent } from "../partnerScope";
import { purgeExpiredEditorialTrash } from "../editorialTrash";

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
    next();
  });
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
    if (isCronWithBearer) return next();
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
  app.post("/api/scheduled/editorial-trash-purge", async (req, res) => {
    try {
      const configuredSecret = process.env.EDITORIAL_TRASH_CRON_SECRET;
      const receivedToken = req.header("authorization")?.replace(/^Bearer\s+/i, "") || "";
      const validSecret = configuredSecret
        ? receivedToken.length === configuredSecret.length && timingSafeEqual(Buffer.from(receivedToken), Buffer.from(configuredSecret))
        : false;
      const user = validSecret ? null : await sdk.authenticateRequest(req);
      if (!validSecret && !(user as typeof user & { isCron?: boolean } | null)?.isCron) return res.status(403).json({ error: "cron-only" });
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "database-unavailable" });
      const result = await purgeExpiredEditorialTrash(db);
      return res.json({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida ao expurgar a Lixeira Editorial.";
      console.error("[EditorialTrashPurge]", error);
      return res.status(500).json({ error: message, context: { path: "/api/scheduled/editorial-trash-purge" }, timestamp: new Date().toISOString() });
    }
  });
  app.get("/api/editorial/events", (_req, res) => openEditorialEventStream(res));
  app.post("/api/media/upload", express.raw({ type: ["image/*", "video/*", "audio/*", "application/pdf"], limit: "16mb" }), async (req, res) => {
    let uploadId: string | null = null;
    let db: NonNullable<Awaited<ReturnType<typeof getDb>>> | null = null;
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) return res.status(401).json({ message: "Faça login para enviar arquivos." });
      if (!["criador", "editor", "aprovador", "administrador", "administrador principal"].includes(user.role)) {
        return res.status(403).json({ message: "Seu perfil não possui permissão para enviar mídia." });
      }
      const filename = String(req.header("x-file-name") || "arquivo").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180);
      const contentType = req.header("content-type") || "application/octet-stream";
      if (!/^(image|video|audio)\/[a-z0-9.+-]+$|^application\/pdf$/i.test(contentType)) {
        return res.status(415).json({ message: "Tipo de arquivo não permitido." });
      }
      if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ message: "Selecione um arquivo válido." });
      const requestedUploadId = String(req.header("x-upload-id") || "").trim();
      if (requestedUploadId && !/^[a-zA-Z0-9_-]{12,96}$/.test(requestedUploadId)) return res.status(400).json({ message: "O identificador de upload é inválido." });
      uploadId = requestedUploadId || randomUUID();
      const partnerHeader = String(req.header("x-partner-id") || "").trim();
      const territoryHeader = String(req.header("x-territory-id") || "").trim();
      const partnerId = partnerHeader ? Number(partnerHeader) : null;
      const territoryId = territoryHeader ? Number(territoryHeader) : null;
      if ((partnerHeader && (!Number.isInteger(partnerId) || partnerId! <= 0)) || (territoryHeader && (!Number.isInteger(territoryId) || territoryId! <= 0))) return res.status(400).json({ message: "O contexto territorial do upload é inválido." });
      db = await getDb();
      if (!db) return res.status(503).json({ message: "Banco de dados indisponível para registrar o upload." });
      if (partnerId || territoryId) {
        try {
          await assertPartnerScope({ db, actor: user, partnerId, territoryIds: territoryId ? [territoryId] : [], resourceLabel: "este upload", requirePartner: Boolean(partnerId) });
        } catch (error) {
          return res.status(403).json({ message: error instanceof Error ? error.message : "Você não possui escopo para este upload." });
        }
      }
      const checksum = createHash("sha256").update(req.body).digest("hex");
      const existing = (await db.select().from(uploadSessions).where(eq(uploadSessions.id, uploadId)).limit(1))[0];
      if (existing) {
        if (existing.userId !== user.id) return res.status(403).json({ message: "Este identificador de upload pertence a outro usuário." });
        if (["Pronto", "Aprovado", "Publicado"].includes(existing.status) && existing.assetUrl && existing.storageKey) return res.status(200).json({ uploadId, assetUrl: existing.assetUrl, storageKey: existing.storageKey, filename: existing.filename, size: existing.fileSize, durationSeconds: existing.durationSeconds, checksum: existing.checksum, status: existing.status, reused: true });
        if (["Enviando", "Enviado", "Processando"].includes(existing.status)) return res.status(409).json({ message: "Este upload já está em processamento. Aguarde a conclusão antes de tentar novamente.", uploadId });
        await db.update(uploadSessions).set({ status: "Enviando", partnerId, territoryId, filename, contentType, checksum, errorMessage: null, assetUrl: null, storageKey: null, fileSize: null, durationSeconds: null, completedAt: null, attemptCount: existing.attemptCount + 1, rejectedBy: null, rejectedAt: null, cancelledAt: null }).where(eq(uploadSessions.id, uploadId));
      } else {
        const mediaType = contentType.startsWith("image/") ? "foto" : contentType.startsWith("video/") ? "vídeo" : contentType.startsWith("audio/") ? "áudio" : "documento";
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
          if (durationSeconds > 60) return res.status(400).json({ message: "O vídeo ultrapassa o máximo absoluto de 60 segundos." });
        } catch {
          return res.status(400).json({ message: "Não foi possível inspecionar a duração real do vídeo. Envie um arquivo de vídeo válido." });
        }
      }
      await db.update(uploadSessions).set({ status: "Processando" }).where(eq(uploadSessions.id, uploadId));
      const uploaded = await storagePut(`media/${user.id}/${uploadId}-${filename}`, req.body, contentType);
      await db.update(uploadSessions).set({ status: "Pronto", storageKey: uploaded.key, assetUrl: uploaded.url, fileSize: req.body.length, durationSeconds: durationSeconds ?? null, completedAt: new Date() }).where(eq(uploadSessions.id, uploadId));
      await recordAuditEvent(db, { actorId: user.id, partnerId, territoryId, resourceType: "upload-session", resourceId: null, action: "upload-ready", nextState: { uploadId, status: "Pronto", filename, checksum }, detail: "Arquivo enviado ao storage e pronto para registro no Acervo; nenhuma publicação foi criada." });
      return res.status(201).json({ ...uploaded, uploadId, filename, size: req.body.length, durationSeconds, checksum, status: "Pronto" });
    } catch (error) {
      if (db && uploadId) await db.update(uploadSessions).set({ status: "Falhou", errorMessage: error instanceof Error ? error.message.slice(0, 4000) : "Falha desconhecida no upload." }).where(eq(uploadSessions.id, uploadId)).catch(() => undefined);
      console.error("[MediaUpload]", error);
      return res.status(500).json({ message: "Não foi possível enviar o arquivo. Tente novamente." });
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
    const oauthConfigured = Boolean(process.env.OAUTH_SERVER_URL && process.env.VITE_APP_ID && process.env.VITE_OAUTH_PORTAL_URL);
    const storageConfigured = Boolean((process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY) || (process.env.S3_BUCKET && (process.env.S3_REGION || process.env.AWS_REGION)));
    console.info(`[Runtime] Ojú Mídia iniciado em modo ${runtime}; porta ${port}; OAuth ${oauthConfigured ? "configurado" : "pendente"}; storage ${storageConfigured ? "configurado" : "pendente"}.`);
  });
}

startServer().catch(console.error);
