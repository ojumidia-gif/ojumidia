import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { mediaOutlets, networkExecutors, professionalProfiles, professionalProfileSpecialties } from "../drizzle/schema";
import { encodeSpecialties, resolveNetworkBond, specialtyIdsOf, type NetworkBondNowId, type ProfessionalSpecialtyId } from "@shared/professionalSpecialties";
import type { getDb } from "./db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export function isMissingProfessionalNetworkSchema(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${error}` : String(error);
  return /professionalProfiles|professionalProfileSpecialties|mediaOutlets|professionalProfileId|ER_NO_SUCH_TABLE|doesn't exist|Unknown column|ER_BAD_FIELD_ERROR/i.test(text);
}

export function hideProfessionalNetworkSql(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  console.error("[professionalNetwork]", error);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Não foi possível atualizar o perfil profissional agora.",
  });
}

async function withOptionalProfessionalNetwork<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isMissingProfessionalNetworkSchema(error)) return fallback;
    throw error;
  }
}

export async function replaceProfileSpecialties(db: Db, profileId: number, specialtyIds: ProfessionalSpecialtyId[]) {
  await db.delete(professionalProfileSpecialties).where(eq(professionalProfileSpecialties.profileId, profileId));
  const unique = Array.from(new Set(specialtyIds));
  if (unique.length) {
    await db.insert(professionalProfileSpecialties).values(unique.map(specialtyId => ({ profileId, specialtyId })));
  }
}

export async function upsertProfessionalProfile(db: Db, input: {
  email: string;
  displayName: string;
  specialties: string[];
  hasOwnMedia?: boolean;
  mediaOutletName?: string | null;
  mediaOutletUrl?: string | null;
  bond?: string | null;
  userId?: number | null;
  joinRequestId?: number | null;
  partnerId?: number | null;
  territoryId?: number | null;
  createdBy?: number | null;
  activate?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  const specialtyIds = specialtyIdsOf(input.specialties);
  if (!specialtyIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha ao menos uma especialidade profissional. Isso não é um papel de acesso." });
  const hasOwnMedia = Boolean(input.hasOwnMedia);
  const networkBond: NetworkBondNowId = resolveNetworkBond({ hasOwnMedia, bond: input.bond });
  const existing = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.email, email)).limit(1))[0];
  const values = {
    email,
    displayName: input.displayName.slice(0, 240),
    networkBond,
    hasOwnMedia,
    mediaOutletName: input.mediaOutletName?.trim() || null,
    mediaOutletUrl: input.mediaOutletUrl?.trim() || null,
    joinRequestId: input.joinRequestId ?? existing?.joinRequestId ?? null,
    partnerId: input.partnerId ?? existing?.partnerId ?? null,
    territoryId: input.territoryId ?? existing?.territoryId ?? null,
    userId: input.userId ?? existing?.userId ?? null,
    createdBy: input.createdBy ?? existing?.createdBy ?? null,
    status: (input.activate ? "Ativo" : existing?.status || "Rascunho") as "Rascunho" | "Ativo" | "Suspenso",
  };
  let profileId: number;
  if (existing) {
    await db.update(professionalProfiles).set(values).where(eq(professionalProfiles.id, existing.id));
    profileId = existing.id;
  } else {
    const created = await db.insert(professionalProfiles).values(values);
    profileId = Number(created[0].insertId);
  }
  await replaceProfileSpecialties(db, profileId, specialtyIds);
  if (hasOwnMedia && values.mediaOutletName) {
    const outlet = (await db.select().from(mediaOutlets).where(eq(mediaOutlets.profileId, profileId)).limit(1))[0];
    const outletValues = { profileId, name: values.mediaOutletName, siteUrl: values.mediaOutletUrl, instagramHandle: null as string | null };
    if (outlet) await db.update(mediaOutlets).set(outletValues).where(eq(mediaOutlets.id, outlet.id));
    else await db.insert(mediaOutlets).values(outletValues);
  }
  await linkExecutorToProfessionalProfile(db, { email, profileId, userId: values.userId });
  return { profileId, specialtyIds, networkBond, encoded: encodeSpecialties(specialtyIds) };
}

export async function attachProfessionalProfileUser(db: Db, input: { email: string; userId: number }) {
  return withOptionalProfessionalNetwork(async () => {
    const email = input.email.trim().toLowerCase();
    const profile = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.email, email)).limit(1))[0];
    if (!profile) return null;
    if (profile.userId === input.userId) return profile;
    await db.update(professionalProfiles).set({ userId: input.userId }).where(eq(professionalProfiles.id, profile.id));
    return { ...profile, userId: input.userId };
  }, null);
}

export async function linkExecutorToProfessionalProfile(db: Db, input: { email: string; profileId: number; userId?: number | null }) {
  return withOptionalProfessionalNetwork(async () => {
    const email = input.email.trim().toLowerCase();
    const executor = (await db.select({ id: networkExecutors.id }).from(networkExecutors).where(eq(networkExecutors.email, email)).limit(1))[0];
    if (!executor) return;
    await db.update(networkExecutors).set({
      professionalProfileId: input.profileId,
      linkedUserId: input.userId ?? undefined,
    }).where(eq(networkExecutors.id, executor.id));
  }, undefined);
}

export async function attachExecutorRecordToProfile(db: Db, input: { executorId: number; email?: string | null; linkedUserId?: number | null }) {
  return withOptionalProfessionalNetwork(async () => {
    const email = input.email?.trim().toLowerCase();
    if (!email) return;
    const profile = (await db.select({ id: professionalProfiles.id, userId: professionalProfiles.userId }).from(professionalProfiles).where(eq(professionalProfiles.email, email)).limit(1))[0];
    if (!profile) return;
    await db.update(networkExecutors).set({
      professionalProfileId: profile.id,
      linkedUserId: input.linkedUserId ?? profile.userId ?? undefined,
    }).where(eq(networkExecutors.id, input.executorId));
  }, undefined);
}

export async function professionalProfileForUser(db: Db, userId: number) {
  return withOptionalProfessionalNetwork(async () => {
    const profile = (await db.select().from(professionalProfiles).where(eq(professionalProfiles.userId, userId)).limit(1))[0];
    if (!profile) return null;
    const rows = await db.select().from(professionalProfileSpecialties).where(eq(professionalProfileSpecialties.profileId, profile.id));
    return { ...profile, specialtyIds: rows.map(item => item.specialtyId) };
  }, null);
}

export async function professionalProfilesByEmails(db: Db, emails: string[]) {
  const unique = Array.from(new Set(emails.map(item => item.trim().toLowerCase()).filter(Boolean)));
  if (!unique.length) return new Map<string, Awaited<ReturnType<typeof professionalProfileForUser>>>();
  return withOptionalProfessionalNetwork(async () => {
    const profiles = await db.select().from(professionalProfiles).where(inArray(professionalProfiles.email, unique));
    const ids = profiles.map(item => item.id);
    const rows = ids.length ? await db.select().from(professionalProfileSpecialties).where(inArray(professionalProfileSpecialties.profileId, ids)) : [];
    const byProfile = new Map<number, string[]>();
    rows.forEach(row => {
      const current = byProfile.get(row.profileId) || [];
      current.push(row.specialtyId);
      byProfile.set(row.profileId, current);
    });
    return new Map(profiles.map(profile => [profile.email, { ...profile, specialtyIds: byProfile.get(profile.id) || [] }]));
  }, new Map());
}
