import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { networkNotificationPreferences, networkNotifications } from "../drizzle/schema";
import { notificationVisibleTo, type NetworkNotificationType } from "@shared/networkOperations";
import { recordAuditEvent } from "./partnerScope";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Actor = { id: number; role: string };

export function isMissingNotificationSchema(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${error}` : String(error);
  return /networkNotifications|networkNotificationPreferences|ER_NO_SUCH_TABLE|doesn't exist/i.test(text);
}

async function withOptionalNotificationSchema<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isMissingNotificationSchema(error)) return fallback;
    throw error;
  }
}

export async function createNetworkNotification(db: Db, input: {
  actorId: number | null;
  recipientUserId: number | null | undefined;
  type: NetworkNotificationType;
  referenceType: string;
  referenceId: number;
  partnerId?: number | null;
  territoryId?: number | null;
}) {
  if (!input.recipientUserId) return null;
  return withOptionalNotificationSchema(async () => {
    const prefs = (await db.select().from(networkNotificationPreferences).where(eq(networkNotificationPreferences.userId, input.recipientUserId!)).limit(1))[0];
    if (prefs && !prefs.inApp) return null;
    const inserted = await db.insert(networkNotifications).values({
      recipientUserId: input.recipientUserId!,
      type: input.type,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    });
    const id = Number(inserted[0].insertId);
    await recordAuditEvent(db, {
      actorId: input.actorId,
      partnerId: input.partnerId ?? null,
      territoryId: input.territoryId ?? null,
      resourceType: "network-notification",
      resourceId: id,
      action: "notification_created",
      nextState: { type: input.type, referenceType: input.referenceType, referenceId: input.referenceId, recipientUserId: input.recipientUserId },
      detail: "Notificação operacional interna. Aponta para a entidade; não é feed nem rede social.",
    });
    return { id };
  }, null);
}

export async function listMyNetworkNotifications(db: Db, actor: Actor) {
  return withOptionalNotificationSchema(async () => {
    return db.select().from(networkNotifications).where(eq(networkNotifications.recipientUserId, actor.id)).orderBy(desc(networkNotifications.createdAt));
  }, []);
}

export async function markNetworkNotificationRead(db: Db, actor: Actor, id: number) {
  const row = (await db.select().from(networkNotifications).where(eq(networkNotifications.id, id)).limit(1))[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Notificação não encontrada." });
  if (!notificationVisibleTo(actor.id, row.recipientUserId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta notificação não é sua." });
  }
  await db.update(networkNotifications).set({ readAt: new Date() }).where(and(eq(networkNotifications.id, id), isNull(networkNotifications.readAt)));
  await recordAuditEvent(db, {
    actorId: actor.id,
    resourceType: "network-notification",
    resourceId: id,
    action: "notification_read",
    nextState: { read: true },
    detail: "Notificação marcada como lida pelo destinatário.",
  });
  return { success: true as const };
}

export async function getMyNotificationPreferences(db: Db, actor: Actor): Promise<{ userId: number; inApp: boolean; emailTransactional: boolean }> {
  return withOptionalNotificationSchema(async () => {
    const row = (await db.select().from(networkNotificationPreferences).where(eq(networkNotificationPreferences.userId, actor.id)).limit(1))[0];
    return { userId: actor.id, inApp: row?.inApp ?? true, emailTransactional: row?.emailTransactional ?? false };
  }, { userId: actor.id, inApp: true, emailTransactional: false });
}

export async function saveMyNotificationPreferences(db: Db, actor: Actor, input: { inApp: boolean; emailTransactional: boolean }) {
  return withOptionalNotificationSchema(async () => {
    const existing = (await db.select().from(networkNotificationPreferences).where(eq(networkNotificationPreferences.userId, actor.id)).limit(1))[0];
    if (existing) {
      await db.update(networkNotificationPreferences).set({ inApp: input.inApp, emailTransactional: input.emailTransactional }).where(eq(networkNotificationPreferences.userId, actor.id));
    } else {
      await db.insert(networkNotificationPreferences).values({ userId: actor.id, inApp: input.inApp, emailTransactional: input.emailTransactional });
    }
    return { success: true as const };
  }, { success: true as const });
}
