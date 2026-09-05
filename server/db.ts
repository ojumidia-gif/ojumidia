import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import { administratorResponsibilityTerms, collaboratorAccessGrants, InsertUser, users } from "../drizzle/schema";
import { isAuthorizedSuperAdmin } from './_core/env';
import { mysqlConnectionFromUrl } from "./mysqlConnection";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const { uri, ssl } = mysqlConnectionFromUrl(process.env.DATABASE_URL);
      const pool = mysql.createPool({
        uri,
        ssl,
        waitForConnections: true,
        connectionLimit: 10,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    const localAdminEmail = process.env.OJU_LOCAL_ADMIN_EMAIL?.trim().toLowerCase();
    const isLocalPrimaryAdmin =
      process.env.NODE_ENV === "development" &&
      Boolean(localAdminEmail) &&
      user.email?.trim().toLowerCase() === localAdminEmail;

    const normalizedEmail = user.email?.trim().toLowerCase();
    const grant = normalizedEmail ? (await db.select().from(collaboratorAccessGrants).where(and(eq(collaboratorAccessGrants.email, normalizedEmail), eq(collaboratorAccessGrants.status, "Autorizado"))).limit(1))[0] : undefined;

    const activeResponsibilityTerm = grant?.role === "administrador"
      ? (await db.select().from(administratorResponsibilityTerms).where(and(eq(administratorResponsibilityTerms.grantId, grant.id), eq(administratorResponsibilityTerms.status, "Assinado via gov.br"))).limit(1))[0]
      : undefined;

    if (isLocalPrimaryAdmin) {
      values.role = "administrador principal";
      updateSet.role = "administrador principal";
      values.adminAccess = true;
      updateSet.adminAccess = true;
    } else if (isAuthorizedSuperAdmin(user.openId, user.email)) {
      values.role = "administrador principal";
      updateSet.role = "administrador principal";
      values.adminAccess = true;
      updateSet.adminAccess = true;
    } else if (grant && (grant.role !== "administrador" || activeResponsibilityTerm)) {
      values.role = grant.role;
      updateSet.role = grant.role;
      values.adminAccess = true;
      updateSet.adminAccess = true;
    } else if (grant) {
      values.role = "criador";
      updateSet.role = "criador";
      values.adminAccess = false;
      updateSet.adminAccess = false;
    } else {
      values.role = "criador";
      updateSet.role = "criador";
      values.adminAccess = false;
      updateSet.adminAccess = false;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
    if (grant) {
      const matchedUser = (await db.select({ id: users.id }).from(users).where(eq(users.openId, user.openId)).limit(1))[0];
      if (matchedUser && grant.userId !== matchedUser.id) await db.update(collaboratorAccessGrants).set({ userId: matchedUser.id }).where(eq(collaboratorAccessGrants.id, grant.id));
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}
