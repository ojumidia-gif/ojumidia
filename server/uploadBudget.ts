import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { STORAGE_QUOTA_SETTING } from "@shared/const";
import { mediaAssets, settings, uploadSessions } from "../drizzle/schema";
import type { getDb } from "./db";
import { parseStorageQuotaPolicy, quotaDecision, type StorageQuotaPolicy } from "./uploadGuards";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function loadStorageQuotaPolicy(db: Db): Promise<StorageQuotaPolicy> {
  const row = (await db.select().from(settings).where(eq(settings.settingKey, STORAGE_QUOTA_SETTING)).limit(1))[0];
  return parseStorageQuotaPolicy(row?.settingValue);
}

export async function saveStorageQuotaPolicy(db: Db, policy: StorageQuotaPolicy, actorId: number) {
  const settingValue = JSON.stringify(policy);
  const existing = (await db.select({ id: settings.id }).from(settings).where(eq(settings.settingKey, STORAGE_QUOTA_SETTING)).limit(1))[0];
  if (existing) await db.update(settings).set({ settingValue, updatedBy: actorId }).where(eq(settings.id, existing.id));
  else await db.insert(settings).values({ settingKey: STORAGE_QUOTA_SETTING, settingValue, updatedBy: actorId });
}

export async function recordedBytesForUser(db: Db, userId: number) {
  const media = await db.select({ value: sql<number>`coalesce(sum(${mediaAssets.fileSize}), 0)` }).from(mediaAssets).where(eq(mediaAssets.createdBy, userId));
  const sessions = await db.select({ value: sql<number>`coalesce(sum(${uploadSessions.fileSize}), 0)` }).from(uploadSessions).leftJoin(mediaAssets, eq(mediaAssets.uploadId, uploadSessions.id)).where(and(eq(uploadSessions.userId, userId), isNull(mediaAssets.id)));
  return Number(media[0]?.value || 0) + Number(sessions[0]?.value || 0);
}

export async function recordedBytesGlobal(db: Db) {
  const media = await db.select({ value: sql<number>`coalesce(sum(${mediaAssets.fileSize}), 0)` }).from(mediaAssets);
  const sessions = await db.select({ value: sql<number>`coalesce(sum(${uploadSessions.fileSize}), 0)` }).from(uploadSessions).leftJoin(mediaAssets, eq(mediaAssets.uploadId, uploadSessions.id)).where(isNull(mediaAssets.id));
  return Number(media[0]?.value || 0) + Number(sessions[0]?.value || 0);
}

export async function uploadsInWindow(db: Db, userId: number | null, since: Date) {
  if (userId) {
    const row = await db.select({ value: count() }).from(uploadSessions).where(and(eq(uploadSessions.userId, userId), gt(uploadSessions.createdAt, since)));
    return Number(row[0]?.value || 0);
  }
  const row = await db.select({ value: count() }).from(uploadSessions).where(gt(uploadSessions.createdAt, since));
  return Number(row[0]?.value || 0);
}

export async function enforceUploadBudget(db: Db, userId: number, incomingBytes: number) {
  const policy = await loadStorageQuotaPolicy(db);
  const since = new Date(Date.now() - policy.windowMinutes * 60 * 1000);
  const [userUploads, globalUploads, userBytes, globalBytes] = await Promise.all([
    uploadsInWindow(db, userId, since),
    uploadsInWindow(db, null, since),
    recordedBytesForUser(db, userId),
    recordedBytesGlobal(db),
  ]);
  if (userUploads >= policy.userUploadsPerWindow) {
    return { ok: false as const, status: 429, message: "Muitos envios neste intervalo. Aguarde e tente de novo." };
  }
  if (globalUploads >= policy.globalUploadsPerWindow) {
    return { ok: false as const, status: 429, message: "A fila de envio está saturada. Aguarde um momento." };
  }
  const nextUser = userBytes + incomingBytes;
  const nextGlobal = globalBytes + incomingBytes;
  if (quotaDecision(nextUser, policy.userAlertBytes, policy.userBlockBytes) === "block") {
    return { ok: false as const, status: 403, message: "Sua quota de armazenamento foi atingida. A Equipe Ojú pode ampliar o limite sem mudar o código." };
  }
  if (quotaDecision(nextGlobal, policy.globalAlertBytes, policy.globalBlockBytes) === "block") {
    return { ok: false as const, status: 403, message: "A quota global de armazenamento do Beta foi atingida. Avise a Equipe Ojú para ampliar o limite." };
  }
  const alert = quotaDecision(nextUser, policy.userAlertBytes, policy.userBlockBytes) === "alert"
    || quotaDecision(nextGlobal, policy.globalAlertBytes, policy.globalBlockBytes) === "alert";
  return { ok: true as const, alert, policy, userBytes: nextUser, globalBytes: nextGlobal };
}
