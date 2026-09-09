import { eq } from "drizzle-orm";
import { collaboratorAccessGrants, users } from "../drizzle/schema";
import { getDb } from "./db";
import { recordAuditEvent, syncPartnerMemberFromGrant } from "./partnerScope";
import { attachProfessionalProfileUser } from "./professionalNetwork";
import { bindTermsAcceptancesToUser } from "./termsOfUse";

export async function applyLoginSideEffects(input: {
  openId: string;
  loginMethod: string | null;
  outcome: "success" | "failure";
  detail: string;
  email?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  const account = (await db.select({ id: users.id, role: users.role, adminAccess: users.adminAccess, email: users.email }).from(users).where(eq(users.openId, input.openId)).limit(1))[0];
  const grant = account?.email
    ? (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.email, account.email.trim().toLowerCase())).limit(1))[0]
    : undefined;
  if (input.outcome === "success" && account && grant?.partnerId && grant.territoryId && grant.status === "Autorizado") {
    try {
      await syncPartnerMemberFromGrant(db, { userId: account.id, partnerId: grant.partnerId, territoryId: grant.territoryId, createdBy: grant.createdBy });
    } catch (error) {
      console.warn("[Auth] Escopo territorial do grant não pôde ser aplicado no login:", error);
    }
  }
  if (input.outcome === "success" && account?.email) {
    try {
      await attachProfessionalProfileUser(db, { email: account.email, userId: account.id });
    } catch (error) {
      console.warn("[Auth] Perfil profissional não pôde ser ligado no login:", error);
    }
    try {
      await bindTermsAcceptancesToUser(db, { userId: account.id, email: account.email });
    } catch (error) {
      console.warn("[Auth] Aceite dos Termos de Uso não pôde ser vinculado no login:", error);
    }
  }
  await recordAuditEvent(db, {
    actorId: account?.id ?? null,
    partnerId: grant?.partnerId ?? null,
    territoryId: grant?.territoryId ?? null,
    resourceType: "auth",
    resourceId: account?.id ?? null,
    action: input.outcome === "success" ? "login-success" : "login-failure",
    nextState: {
      loginMethod: input.loginMethod,
      role: account?.role ?? null,
      adminAccess: account?.adminAccess ?? false,
      email: account?.email || input.email || null,
    },
    detail: input.detail,
  });
}
