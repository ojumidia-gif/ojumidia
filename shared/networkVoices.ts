export const networkVoiceStatuses = [
  "Aguardando análise",
  "Ajuste solicitado",
  "Aprovado",
  "Publicado",
  "Rejeitado",
  "Retirado",
] as const;

export type NetworkVoiceStatus = (typeof networkVoiceStatuses)[number];

export const networkVoiceRelations = [
  "Casa",
  "Profissional",
  "Pessoa retratada",
  "Parceiro",
  "Outro",
] as const;

export type NetworkVoiceRelation = (typeof networkVoiceRelations)[number];

export const networkVoiceNameVisibilities = ["Nome", "Pseudônimo", "Não divulgar"] as const;

export const networkVoiceCurationScopes = ["Nenhum", "Territorial", "Nacional"] as const;

export type NetworkVoiceCurationScope = (typeof networkVoiceCurationScopes)[number];

export const networkVoiceStaffActions = [
  "approve",
  "reject",
  "requestAdjustment",
  "resubmit",
  "publish",
  "unpublish",
  "reopen",
] as const;

export type NetworkVoiceStaffAction = (typeof networkVoiceStaffActions)[number];

const transitions: Record<NetworkVoiceStaffAction, readonly NetworkVoiceStatus[]> = {
  approve: ["Aguardando análise"],
  reject: ["Aguardando análise", "Ajuste solicitado", "Aprovado"],
  requestAdjustment: ["Aguardando análise"],
  resubmit: ["Ajuste solicitado"],
  publish: ["Aprovado", "Retirado"],
  unpublish: ["Publicado"],
  reopen: ["Rejeitado", "Retirado"],
};

const nextStatus: Record<NetworkVoiceStaffAction, NetworkVoiceStatus> = {
  approve: "Aprovado",
  reject: "Rejeitado",
  requestAdjustment: "Ajuste solicitado",
  resubmit: "Aguardando análise",
  publish: "Publicado",
  unpublish: "Retirado",
  reopen: "Aguardando análise",
};

export function canTransitionNetworkVoice(status: NetworkVoiceStatus, action: NetworkVoiceStaffAction) {
  return transitions[action].includes(status);
}

export function nextNetworkVoiceStatus(status: NetworkVoiceStatus, action: NetworkVoiceStaffAction): NetworkVoiceStatus {
  if (!canTransitionNetworkVoice(status, action)) {
    throw new Error("Esta etapa editorial não admite essa ação.");
  }
  return nextStatus[action];
}

export function isNetworkVoicePubliclyVisible(status: NetworkVoiceStatus) {
  return status === "Publicado";
}

export function isNetworkVoiceNationallyCurated(input: { status: NetworkVoiceStatus; curationScope: NetworkVoiceCurationScope }) {
  return input.status === "Publicado" && input.curationScope === "Nacional";
}

export function isNetworkVoiceTerritoriallyCurated(input: { status: NetworkVoiceStatus; curationScope: NetworkVoiceCurationScope }) {
  return input.status === "Publicado" && input.curationScope === "Territorial";
}

export function canSetNationalVoiceCuration(role: string) {
  return role === "administrador principal";
}

export function canManageNetworkVoices(role: string) {
  return role === "administrador" || role === "administrador principal";
}

export function publicSpeakerLabel(input: {
  speakerName: string | null | undefined;
  speakerNameVisibility: (typeof networkVoiceNameVisibilities)[number];
}) {
  if (input.speakerNameVisibility === "Não divulgar") return null;
  const name = input.speakerName?.trim();
  return name || null;
}

export function compareNetworkVoicesForPublicPresentation<T extends {
  curationDisplayOrder: number;
  speakerName: string | null;
}>(a: T, b: T) {
  if (a.curationDisplayOrder !== b.curationDisplayOrder) return a.curationDisplayOrder - b.curationDisplayOrder;
  return (a.speakerName || "").localeCompare(b.speakerName || "", "pt-BR");
}

export function auditActionForVoiceStaffAction(action: NetworkVoiceStaffAction) {
  const map: Record<NetworkVoiceStaffAction, string> = {
    approve: "voice-approve",
    reject: "voice-reject",
    requestAdjustment: "voice-request-adjustment",
    resubmit: "voice-resubmit",
    publish: "voice-publish",
    unpublish: "voice-unpublish",
    reopen: "voice-reopen",
  };
  return map[action];
}
