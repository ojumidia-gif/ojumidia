import { decideProfessionalDirectory } from "./territorialVisibility";

export const commercialOriginKinds = [
  "visitante",
  "visitante-profissional",
  "profissional",
  "oju",
] as const;

export type CommercialOriginKind = (typeof commercialOriginKinds)[number];

export type CommercialOriginRecord = {
  v: 1;
  kind: CommercialOriginKind;
  originatedByProfessionalProfileId: number | null;
  requestedProfessionalProfileId: number | null;
  createdByUserId: number | null;
};

const ORIGIN_PREFIX = "OJU_ORIGIN_V1:";

export function stripOriginFromNotes(notes: string | null | undefined) {
  if (!notes) return "";
  const idx = notes.lastIndexOf(ORIGIN_PREFIX);
  if (idx < 0) return notes.trim();
  return notes.slice(0, idx).trim();
}

export function stampOriginOnNotes(notes: string | null | undefined, origin: CommercialOriginRecord) {
  const clean = stripOriginFromNotes(notes);
  return `${clean}${clean ? "\n\n" : ""}${ORIGIN_PREFIX}${JSON.stringify(origin)}`;
}

export function parseOriginFromNotes(notes: string | null | undefined): CommercialOriginRecord | null {
  if (!notes) return null;
  const idx = notes.lastIndexOf(ORIGIN_PREFIX);
  if (idx < 0) return null;
  try {
    const parsed = JSON.parse(notes.slice(idx + ORIGIN_PREFIX.length).trim()) as CommercialOriginRecord;
    if (parsed?.v !== 1 || !commercialOriginKinds.includes(parsed.kind)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function professionalCanOriginateLead(profile: { status: string; userId?: number | null; territoryId?: number | null }) {
  if (profile.status !== "Ativo") return { ok: false as const, message: "Somente perfil profissional Ativo origina demanda para a Rede." };
  if (!profile.userId) return { ok: false as const, message: "Este perfil ainda não está vinculado a uma conta." };
  if (!profile.territoryId) return { ok: false as const, message: "Defina o território de atuação no perfil antes de originar." };
  return { ok: true as const };
}

export function professionalMayCreateOpportunity(role: string) {
  return role === "administrador" || role === "administrador principal";
}

export function professionalMayMutateCommercialPolicy(role: string) {
  return role === "administrador principal";
}

export function professionalMayMutateSettlement(role: string) {
  return role === "administrador" || role === "administrador principal";
}

export function originationCreatesPublication() {
  return false;
}

export function originationCreatesHomeFeature() {
  return false;
}

export function originationChangesDirectoryRank() {
  return false;
}

export function salesVolumeChangesDirectoryRank() {
  return false;
}

export function profileAcceptsPublicServiceRequests(profile: { status: string; publicVisible: boolean }) {
  return decideProfessionalDirectory(profile).allowed;
}

export function originatorIsNotRecordCreator(origin: CommercialOriginRecord, createdByUserId: number) {
  if (!origin.originatedByProfessionalProfileId) return false;
  return origin.createdByUserId !== createdByUserId || origin.kind === "profissional";
}

export function professionalOwnsOrigin(origin: CommercialOriginRecord | null, profileId: number) {
  if (!origin) return false;
  return origin.originatedByProfessionalProfileId === profileId || origin.requestedProfessionalProfileId === profileId;
}

export function needsFromWorkType(workType: string) {
  return {
    needsPhotography: workType === "Fotografia" || workType === "Cobertura",
    needsVideo: workType === "Cobertura",
    needsMiniclip: false,
    needsDocumentary: workType === "Documentário",
    needsFullCoverage: workType === "Cobertura",
    needsFormatGuidance: workType === "Outro",
  };
}

export const futureSchemaForOrigination = {
  table: "networkOpportunities",
  columns: ["originatedByProfessionalProfileId", "originKind"],
  reason: "notes+audit preservam origem no Beta; coluna tipada evita edição acidental e permite métricas internas.",
  applyNow: false,
} as const;
