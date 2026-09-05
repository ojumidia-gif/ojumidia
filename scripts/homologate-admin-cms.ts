import "dotenv/config";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  administratorResponsibilityTerms,
  collaboratorAccessGrants,
  commercialRequests,
  commercialTransactions,
  partnerMembers,
  partners,
  partnerTerritories,
  publications,
  publicationTaxonomies,
  taxonomies,
  users,
} from "../drizzle/schema";
import { appRouter } from "../server/routers";
import { getDb } from "../server/db";
import { sdk } from "../server/_core/sdk";
import { describeStorageConfiguration, hasStorageConfiguration, storageGetSignedUrl, storagePut } from "../server/storage";
import type { TrpcContext } from "../server/_core/context";
import type { User } from "../drizzle/schema";

type Outcome = { name: string; expected: string; actual: string; pass: boolean; detail?: string };

function caller(user: User) {
  const ctx = {
    user,
    req: { headers: {}, protocol: "http" },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext;
  return appRouter.createCaller(ctx);
}

async function denied(name: string, fn: () => Promise<unknown>, code = "FORBIDDEN"): Promise<Outcome> {
  try {
    await fn();
    return { name, expected: code, actual: "ALLOWED", pass: false };
  } catch (error) {
    const actual = error instanceof TRPCError ? error.code : error instanceof Error ? error.message : "ERROR";
    return { name, expected: code, actual: String(actual), pass: error instanceof TRPCError && error.code === code, detail: error instanceof Error ? error.message : undefined };
  }
}

async function allowed<T>(name: string, fn: () => Promise<T>): Promise<{ outcome: Outcome; value?: T }> {
  try {
    const value = await fn();
    return { outcome: { name, expected: "ALLOWED", actual: "ALLOWED", pass: true }, value };
  } catch (error) {
    return { outcome: { name, expected: "ALLOWED", actual: error instanceof TRPCError ? error.code : "ERROR", pass: false, detail: error instanceof Error ? error.message : undefined } };
  }
}

async function upsertUserRow(openId: string, email: string, name: string, role: User["role"], adminAccess: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível.");
  const existing = (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
  if (existing) {
    await db.update(users).set({ email, name, role, adminAccess, loginMethod: "homologation-session" }).where(eq(users.id, existing.id));
    return (await db.select().from(users).where(eq(users.id, existing.id)).limit(1))[0]!;
  }
  await db.insert(users).values({ openId, email, name, role, adminAccess, loginMethod: "homologation-session" });
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0]!;
}

async function main() {
  const outcomes: Outcome[] = [];
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL ausente ou banco indisponível. Migração/homologação não pode seguir.");

  const superUser = (await db.select().from(users).where(eq(users.role, "administrador principal")).limit(1))[0]
    ?? await upsertUserRow("homolog-super-admin", "homolog.super@ojumidia.test", "Super Admin homologação", "administrador principal", true);

  const terrA = (await db.select().from(taxonomies).where(eq(taxonomies.slug, "homolog-territorio-a")).limit(1))[0]
    ?? (await db.insert(taxonomies).values({ dimension: "Território", name: "Território Homolog A", slug: "homolog-territorio-a" }), (await db.select().from(taxonomies).where(eq(taxonomies.slug, "homolog-territorio-a")).limit(1))[0]!);
  const terrB = (await db.select().from(taxonomies).where(eq(taxonomies.slug, "homolog-territorio-b")).limit(1))[0]
    ?? (await db.insert(taxonomies).values({ dimension: "Território", name: "Território Homolog B", slug: "homolog-territorio-b" }), (await db.select().from(taxonomies).where(eq(taxonomies.slug, "homolog-territorio-b")).limit(1))[0]!);

  async function ensurePartner(slug: string, name: string, territoryId: number) {
    let partner = (await db.select().from(partners).where(eq(partners.slug, slug)).limit(1))[0];
    if (!partner) {
      const result = await db.insert(partners).values({ displayName: name, slug, status: "Ativo", publicVisibility: false, createdBy: superUser.id, approvedBy: superUser.id, approvedAt: new Date() });
      partner = (await db.select().from(partners).where(eq(partners.id, Number(result[0].insertId))).limit(1))[0]!;
    }
    const link = (await db.select().from(partnerTerritories).where(eq(partnerTerritories.activeKey, `${partner.id}:${territoryId}`)).limit(1))[0];
    if (!link) {
      await db.insert(partnerTerritories).values({ partnerId: partner.id, territoryId, status: "Ativa", activeKey: `${partner.id}:${territoryId}`, createdBy: superUser.id });
    }
    return partner;
  }

  const partnerA = await ensurePartner("parceiro-homolog-a", "Parceiro Homolog A", terrA.id);
  const partnerB = await ensurePartner("parceiro-homolog-b", "Parceiro Homolog B", terrB.id);

  const adminA = await upsertUserRow("homolog-admin-a", "homolog.admin.a@ojumidia.test", "Admin Homolog A", "administrador", true);
  const adminB = await upsertUserRow("homolog-admin-b", "homolog.admin.b@ojumidia.test", "Admin Homolog B", "administrador", true);

  async function ensureGrant(user: User, partnerId: number, territoryId: number) {
    const email = user.email!;
    let grant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.email, email)).limit(1))[0];
    if (!grant) {
      const result = await db.insert(collaboratorAccessGrants).values({ email, displayName: user.name, role: "administrador", status: "Autorizado", userId: user.id, partnerId, territoryId, createdBy: superUser.id });
      grant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, Number(result[0].insertId))).limit(1))[0]!;
    } else {
      await db.update(collaboratorAccessGrants).set({ userId: user.id, partnerId, territoryId, role: "administrador", status: "Autorizado" }).where(eq(collaboratorAccessGrants.id, grant.id));
      grant = (await db.select().from(collaboratorAccessGrants).where(eq(collaboratorAccessGrants.id, grant.id)).limit(1))[0]!;
    }
    const term = (await db.select().from(administratorResponsibilityTerms).where(eq(administratorResponsibilityTerms.grantId, grant.id)).limit(1))[0];
    if (!term) {
      await db.insert(administratorResponsibilityTerms).values({ grantId: grant.id, email, status: "Assinado via gov.br", signedAt: new Date(), createdByUserId: superUser.id, uploadedByUserId: superUser.id, signedFilename: "homolog.pdf", signedDocumentUrl: "/private/homolog", signedStorageKey: "homolog/term.pdf" });
    } else if (term.status !== "Assinado via gov.br") {
      await db.update(administratorResponsibilityTerms).set({ status: "Assinado via gov.br", signedAt: new Date() }).where(eq(administratorResponsibilityTerms.id, term.id));
    }
    const member = (await db.select().from(partnerMembers).where(eq(partnerMembers.userId, user.id)).limit(1))[0];
    if (!member) {
      await db.insert(partnerMembers).values({ partnerId, userId: user.id, territoryId, operationalRole: "Gestor territorial", status: "Ativo", createdBy: superUser.id, activatedAt: new Date() });
    } else {
      await db.update(partnerMembers).set({ partnerId, territoryId, status: "Ativo" }).where(eq(partnerMembers.id, member.id));
    }
    await db.update(users).set({ role: "administrador", adminAccess: true }).where(eq(users.id, user.id));
    return (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0]!;
  }

  const userA = await ensureGrant(adminA, partnerA.id, terrA.id);
  const userB = await ensureGrant(adminB, partnerB.id, terrB.id);
  const principal = (await db.select().from(users).where(eq(users.id, superUser.id)).limit(1))[0]!;

  const sessionA = await sdk.signSession({ openId: userA.openId, name: userA.name || "Admin A" });
  const sessionB = await sdk.signSession({ openId: userB.openId, name: userB.name || "Admin B" });
  const sessionS = await sdk.signSession({ openId: principal.openId, name: principal.name || "Super Admin" });
  const verifiedA = await sdk.verifySession(sessionA);
  const verifiedB = await sdk.verifySession(sessionB);
  const verifiedS = await sdk.verifySession(sessionS);
  outcomes.push({ name: "sessao-jwt-admin-a", expected: userA.openId, actual: verifiedA?.openId || "", pass: verifiedA?.openId === userA.openId });
  outcomes.push({ name: "sessao-jwt-admin-b", expected: userB.openId, actual: verifiedB?.openId || "", pass: verifiedB?.openId === userB.openId });
  outcomes.push({ name: "sessao-jwt-super", expected: principal.openId, actual: verifiedS?.openId || "", pass: verifiedS?.openId === principal.openId });

  const apiA = caller(userA);
  const apiB = caller(userB);
  const apiS = caller(principal);

  const createdA = await allowed("admin-a-cria-conteudo-a", () => apiA.editorial.create({ title: "Historia Homolog Territorio A", contentKind: "História", teamCredit: "Equipe Homolog A", body: "Texto do território A para homologação territorial." }));
  outcomes.push(createdA.outcome);
  const createdB = await allowed("admin-b-cria-conteudo-b", () => apiB.editorial.create({ title: "Historia Homolog Territorio B", contentKind: "História", teamCredit: "Equipe Homolog B", body: "Texto do território B para homologação territorial." }));
  outcomes.push(createdB.outcome);
  const idA = createdA.value?.id as number | undefined;
  const idB = createdB.value?.id as number | undefined;
  if (!idA || !idB) {
    console.error(JSON.stringify({ createdA: createdA.outcome, createdB: createdB.outcome }, null, 2));
    throw new Error("Falha ao criar publicações A/B.");
  }

  const national = await db.insert(publications).values({ title: "Conteudo nacional homologacao", contentKind: "História", slug: `homolog-nacional-${Date.now()}`, status: "Rascunho", isPublic: false, createdBy: principal.id, partnerId: null });
  const nationalId = Number(national[0].insertId);

  outcomes.push(await (await allowed("admin-a-le-a", () => apiA.editorial.preview({ id: idA }))).outcome);
  outcomes.push(await denied("admin-a-le-b", () => apiA.editorial.preview({ id: idB })));
  outcomes.push(await denied("admin-a-edita-b", () => apiA.editorial.update({ id: idB, expectedVersion: 1, title: "Tentativa indevida B" })));
  outcomes.push(await denied("admin-a-publica-b", () => apiA.editorial.advanceStatus({ id: idB, expectedVersion: 1 })));
  outcomes.push(await denied("admin-a-id-direto-b", () => apiA.editorial.preview({ id: idB })));
  outcomes.push(await denied("admin-a-conteudo-nacional", () => apiA.editorial.preview({ id: nationalId })));
  outcomes.push(await (await allowed("admin-b-le-b", () => apiB.editorial.preview({ id: idB }))).outcome);
  outcomes.push(await denied("admin-b-le-a", () => apiB.editorial.preview({ id: idA })));
  outcomes.push(await (await allowed("super-le-nacional", () => apiS.editorial.preview({ id: nationalId }))).outcome);
  outcomes.push(await (await allowed("super-le-a", () => apiS.editorial.preview({ id: idA }))).outcome);
  outcomes.push(await (await allowed("super-le-b", () => apiS.editorial.preview({ id: idB }))).outcome);

  outcomes.push(await denied("admin-a-lista-colaboradores", () => apiA.collaborators.list()));
  outcomes.push(await denied("admin-a-concede-grant", () => apiA.collaborators.authorize({ email: "escalada@ojumidia.test", role: "administrador", partnerId: partnerA.id, territoryId: terrA.id })));
  outcomes.push(await denied("admin-a-altera-territorio-b", () => apiA.collaborators.update({ id: 1, territoryId: terrA.id, partnerId: partnerA.id })));
  outcomes.push(await denied("admin-a-politica-financeira", () => apiA.financial.createPolicy({ label: "Politica indevida", scope: "Cobertura", effectiveAt: new Date(), ojuPercent: 10, developmentPercent: 0, captorPercent: 0, executorPercent: 90 })));
  outcomes.push(await denied("admin-a-navegacao-global", () => apiA.portalContent.save({ page: "Global", sectionKey: "navigation", label: "Menu", contentJson: "{\"items\":[]}", isVisible: true, displayOrder: 1 })));
  outcomes.push(await denied("admin-a-parceiro-b", () => apiA.partners.update({ id: partnerB.id, expectedVersion: 1, displayName: "Sequestro B" })));
  outcomes.push(await denied("admin-a-curadoria-home", () => apiA.editorial.setFeatured({ id: idA, manualFeatured: true, relevance: 80, homePlacement: "Destaque principal", homeOrder: 1 })));

  const listS = await allowed("super-lista-colaboradores", () => apiS.collaborators.list());
  outcomes.push(listS.outcome);
  const seesA = Boolean(listS.value?.grants.some(grant => grant.email === userA.email));
  const seesB = Boolean(listS.value?.grants.some(grant => grant.email === userB.email));
  outcomes.push({ name: "super-ve-admin-a", expected: "true", actual: String(seesA), pass: seesA });
  outcomes.push({ name: "super-ve-admin-b", expected: "true", actual: String(seesB), pass: seesB });

  const policy1 = await allowed("super-cria-politica-1", () => apiS.financial.createPolicy({ label: "Homolog Cobertura 12", scope: "Cobertura", effectiveAt: new Date(), ojuPercent: 12, developmentPercent: 0, captorPercent: 0, executorPercent: 88 }));
  outcomes.push(policy1.outcome);
  if (policy1.value?.id) {
    outcomes.push((await allowed("super-ativa-politica-1", () => apiS.financial.activatePolicy({ id: policy1.value!.id }))).outcome);
  }
  const requestInsert = await db.insert(commercialRequests).values({ clientName: "Cliente Homolog", contact: "homolog@cliente.test", eventType: "Cobertura teste", status: "Contratado", managedByUserId: principal.id, partnerId: partnerA.id, territoryId: terrA.id });
  const requestId = Number(requestInsert[0].insertId);
  const charge1 = await allowed("super-cobranca-politica-1", () => apiS.financial.recordCharge({ requestId, grossAmount: 1000, executorAmount: 200, partnerGrossAmount: 800, reason: "Homologação política 1" }));
  outcomes.push(charge1.outcome);
  const tx1 = charge1.value ? (await db.select().from(commercialTransactions).where(eq(commercialTransactions.id, charge1.value.id)).limit(1))[0] : undefined;
  outcomes.push({ name: "snapshot-politica-1", expected: "12 / id", actual: `${tx1?.commercialPolicyVersion}/${tx1?.commercialPolicyId}/${tx1?.ojuAmount}`, pass: Boolean(tx1?.commercialPolicyId && tx1.ojuAmount) });

  const policy2 = await allowed("super-cria-politica-2", () => apiS.financial.createPolicy({ label: "Homolog Cobertura 25", scope: "Cobertura", effectiveAt: new Date(), ojuPercent: 25, developmentPercent: 0, captorPercent: 0, executorPercent: 75 }));
  outcomes.push(policy2.outcome);
  if (policy2.value?.id) {
    outcomes.push((await allowed("super-ativa-politica-2", () => apiS.financial.activatePolicy({ id: policy2.value!.id }))).outcome);
  }
  const charge2 = await allowed("super-cobranca-politica-2", () => apiS.financial.recordCharge({ requestId, grossAmount: 1000, executorAmount: 200, partnerGrossAmount: 800, reason: "Homologação política 2" }));
  outcomes.push(charge2.outcome);
  const tx1After = tx1 ? (await db.select().from(commercialTransactions).where(eq(commercialTransactions.id, tx1.id)).limit(1))[0] : undefined;
  const tx2 = charge2.value ? (await db.select().from(commercialTransactions).where(eq(commercialTransactions.id, charge2.value.id)).limit(1))[0] : undefined;
  outcomes.push({ name: "historico-nao-recalcula", expected: String(tx1?.ojuAmount), actual: String(tx1After?.ojuAmount), pass: tx1?.ojuAmount === tx1After?.ojuAmount && tx1?.commercialPolicyVersion === tx1After?.commercialPolicyVersion });
  outcomes.push({ name: "nova-cobranca-nova-politica", expected: "versoes diferentes", actual: `${tx1?.commercialPolicyVersion} vs ${tx2?.commercialPolicyVersion}`, pass: Boolean(tx1 && tx2 && tx1.commercialPolicyVersion !== tx2.commercialPolicyVersion) });

  const audit = await allowed("super-consulta-auditoria", () => apiS.operations.auditLog({ limit: 50 }));
  outcomes.push(audit.outcome);
  const auditText = JSON.stringify(audit.value ?? []);
  outcomes.push({ name: "auditoria-sem-segredo", expected: "sem password/token", actual: auditText.includes("password") || auditText.includes("JWT_SECRET") ? "vazou" : "limpo", pass: !/password|JWT_SECRET|cookieSecret/i.test(auditText) });

  const storageKind = describeStorageConfiguration();
  let storageKey: string | undefined;
  if (hasStorageConfiguration()) {
    try {
      const put = await storagePut(`homologation/${Date.now()}-probe.txt`, Buffer.from("homolog-oju-midia"), "text/plain");
      storageKey = put.key;
      if (storageKind === "tigris" || storageKind === "s3") {
        const signed = await storageGetSignedUrl(put.key);
        const remote = await fetch(signed);
        const body = remote.ok ? await remote.text() : "";
        outcomes.push({ name: "storage-objeto-real", expected: "tigris-bytes", actual: `${storageKind}:${remote.status}:${body.slice(0, 24)}`, pass: remote.ok && body.includes("homolog-oju-midia") });
      } else {
        const { existsSync, readFileSync } = await import("node:fs");
        const { resolve } = await import("node:path");
        const absolute = resolve(process.env.LOCAL_STORAGE_DIR || ".local-storage", put.key);
        const local = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
        outcomes.push({ name: "storage-objeto-real", expected: "arquivo-local", actual: `${storageKind}:${local.slice(0, 24)}`, pass: local.includes("homolog-oju-midia") });
      }
    } catch (error) {
      outcomes.push({ name: "storage-objeto-real", expected: "bytes no Tigris", actual: error instanceof Error ? error.message : "erro", pass: false });
    }
  } else {
    outcomes.push({ name: "storage-objeto-real", expected: "tigris", actual: "missing", pass: false });
  }

  const failed = outcomes.filter(item => !item.pass);
  console.log(JSON.stringify({
    superAdmin: { id: principal.id, email: principal.email, openId: principal.openId },
    adminA: { id: userA.id, email: userA.email, partnerId: partnerA.id, territoryId: terrA.id, publicationId: idA },
    adminB: { id: userB.id, email: userB.email, partnerId: partnerB.id, territoryId: terrB.id, publicationId: idB },
    nationalPublicationId: nationalId,
    storageKind,
    storageKey,
    passed: outcomes.length - failed.length,
    failed: failed.length,
    outcomes,
  }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
