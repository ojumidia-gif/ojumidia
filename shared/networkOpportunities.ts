import { professionalSpecialtyIds, type ProfessionalSpecialtyId } from "./professionalSpecialties";

export const opportunityStatuses = ["Rascunho", "Aberta", "Aceita", "Cancelada", "Expirada"] as const;
export const opportunityInviteStatuses = ["Pendente", "Aceita", "Recusada", "Expirada", "Cancelada", "Superada"] as const;
export const opportunityOrigins = ["Comercial", "Mesa", "Manual"] as const;
export const opportunityWorkTypes = ["Cobertura", "Documentário", "Fotografia", "Outro"] as const;

export type OpportunityStatus = (typeof opportunityStatuses)[number];
export type OpportunityInviteStatus = (typeof opportunityInviteStatuses)[number];
export type OpportunityOrigin = (typeof opportunityOrigins)[number];
export type OpportunityWorkType = (typeof opportunityWorkTypes)[number];

export function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function splitOpportunityEconomics(
  totalValue: number,
  policy: { executorPercent: number | string; ojuPercent: number | string; developmentPercent: number | string; captorPercent: number | string },
) {
  const total = money(totalValue);
  if (!(total > 0)) throw new Error("Informe um valor total previsto maior que zero. Isto ainda não é pagamento.");
  const executorPercent = Number(policy.executorPercent);
  const ojuPercent = Number(policy.ojuPercent);
  const developmentPercent = Number(policy.developmentPercent);
  const captorPercent = Number(policy.captorPercent);
  return {
    totalValue: total,
    professionalValue: money(total * executorPercent / 100),
    ojuValue: money(total * ojuPercent / 100),
    networkFundValue: money(total * developmentPercent / 100),
    captorValue: money(total * captorPercent / 100),
    executorPercent,
    ojuPercent,
    developmentPercent,
    captorPercent,
  };
}

export function policyScopeForWorkType(workType: string): "Cobertura" | "Documentário" | "Fotografia" | "Outro" {
  if (workType === "Documentário" || workType === "Fotografia" || workType === "Cobertura" || workType === "Outro") return workType;
  return "Cobertura";
}

export const executorSpecialtyToProfessionalIds: Record<string, ProfessionalSpecialtyId[]> = {
  Fotografia: ["fotografo"],
  Vídeo: ["videomaker"],
  Documentário: ["documentarista"],
  Edição: ["colaborador-editorial"],
  Produção: ["produtor-cultural"],
  Outro: ["criador-conteudo"],
};

export function specialtiesFromCommercialNeeds(request: {
  needsPhotography?: boolean | null;
  needsVideo?: boolean | null;
  needsMiniclip?: boolean | null;
  needsDocumentary?: boolean | null;
  needsFullCoverage?: boolean | null;
}) {
  const ids = new Set<ProfessionalSpecialtyId>();
  if (request.needsPhotography || request.needsFullCoverage) ids.add("fotografo");
  if (request.needsVideo || request.needsMiniclip || request.needsFullCoverage) ids.add("videomaker");
  if (request.needsDocumentary) ids.add("documentarista");
  return Array.from(ids);
}

export function workTypeFromCommercialNeeds(request: {
  needsDocumentary?: boolean | null;
  needsPhotography?: boolean | null;
  needsVideo?: boolean | null;
  needsFullCoverage?: boolean | null;
}): OpportunityWorkType {
  if (request.needsDocumentary && !request.needsPhotography && !request.needsVideo && !request.needsFullCoverage) return "Documentário";
  if (request.needsPhotography && !request.needsVideo && !request.needsDocumentary && !request.needsFullCoverage) return "Fotografia";
  return "Cobertura";
}

export function canMutateOpportunityEconomics(status: string) {
  return status === "Rascunho" || status === "Aberta";
}

export function isInviteExpired(expiresAt: Date | string | null | undefined, now = new Date()) {
  if (!expiresAt) return false;
  const at = new Date(expiresAt);
  return !Number.isNaN(at.getTime()) && at.getTime() <= now.getTime();
}

export function derivedOpportunityStatus(input: { status: string; acceptanceDeadline?: Date | string | null }, now = new Date()): OpportunityStatus {
  if (input.status === "Aceita" || input.status === "Cancelada" || input.status === "Expirada") return input.status;
  if (input.status === "Aberta" && isInviteExpired(input.acceptanceDeadline, now)) return "Expirada";
  return input.status as OpportunityStatus;
}

export function canAcceptInvite(input: {
  opportunityStatus: string;
  opportunityAcceptanceDeadline?: Date | string | null;
  inviteStatus: string;
  inviteExpiresAt?: Date | string | null;
  inviteProfileId: number;
  actorProfileId: number;
  now?: Date;
}) {
  const now = input.now || new Date();
  if (input.inviteProfileId !== input.actorProfileId) {
    return { ok: false as const, code: "WRONG_RECIPIENT", message: "Este convite não é seu." };
  }
  if (input.opportunityStatus === "Cancelada") {
    return { ok: false as const, code: "CANCELLED", message: "Esta oportunidade foi cancelada." };
  }
  if (input.opportunityStatus === "Aceita") {
    return { ok: false as const, code: "ALREADY_ACCEPTED", message: "Esta oportunidade já foi aceita." };
  }
  const derived = derivedOpportunityStatus({ status: input.opportunityStatus, acceptanceDeadline: input.opportunityAcceptanceDeadline }, now);
  if (derived === "Expirada" || isInviteExpired(input.inviteExpiresAt, now)) {
    return { ok: false as const, code: "EXPIRED", message: "O prazo para aceitar esta oportunidade encerrou." };
  }
  if (input.opportunityStatus !== "Aberta") {
    return { ok: false as const, code: "NOT_OPEN", message: "Esta oportunidade não está aberta para aceite." };
  }
  if (input.inviteStatus !== "Pendente") {
    return { ok: false as const, code: "INVITE_CLOSED", message: "Este convite não está mais pendente." };
  }
  return { ok: true as const };
}

export function inviteStatusesAfterAccept(acceptedInviteId: number, invites: Array<{ id: number; status: string }>) {
  return invites.map(invite => {
    if (invite.id === acceptedInviteId) return { id: invite.id, status: "Aceita" as const };
    if (invite.status === "Pendente") return { id: invite.id, status: "Superada" as const };
    return { id: invite.id, status: invite.status };
  });
}

export function matchProfessionalForOpportunity(input: {
  profileStatus: string;
  networkBond: string;
  specialtyIds: string[];
  authorizedTerritoryIds: number[];
  opportunityTerritoryId: number;
  requiredSpecialtyIds: string[];
  usersRole?: string | null;
}) {
  const reasons: string[] = [];
  if (input.profileStatus === "Suspenso" || input.profileStatus !== "Ativo") {
    reasons.push(input.profileStatus === "Suspenso" ? "Perfil suspenso." : "Perfil suspenso.");
  }
  if (input.networkBond !== "criador-parceiro" && input.networkBond !== "parceiro-midia") {
    reasons.push("Vínculo inativo.");
  }
  if (!input.authorizedTerritoryIds.includes(input.opportunityTerritoryId)) {
    reasons.push("Território incompatível.");
  }
  if (!input.requiredSpecialtyIds.some(id => input.specialtyIds.includes(id))) {
    reasons.push("Especialidade incompatível.");
  }
  void input.usersRole;
  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

export function professionalEligibleForOpportunity(input: Parameters<typeof matchProfessionalForOpportunity>[0]) {
  return matchProfessionalForOpportunity(input).eligible;
}

export function assertKnownSpecialties(ids: string[]) {
  const unknown = ids.filter(id => !professionalSpecialtyIds.includes(id as ProfessionalSpecialtyId));
  if (unknown.length) throw new Error("Use especialidades normalizadas do perfil profissional. Texto livre e users.role não classificam a oportunidade.");
  if (!ids.length) throw new Error("Defina ao menos uma especialidade necessária.");
  return ids as ProfessionalSpecialtyId[];
}

export function professionalMineBucket(inviteStatus: string, opportunityStatus: string, now = new Date(), expiresAt?: Date | string | null) {
  if (inviteStatus === "Aceita" || opportunityStatus === "Aceita" && inviteStatus === "Aceita") return "aceitas";
  if (inviteStatus === "Recusada") return "recusadas";
  if (inviteStatus === "Expirada" || inviteStatus === "Superada" || opportunityStatus === "Expirada" || opportunityStatus === "Cancelada" || isInviteExpired(expiresAt, now)) return "expiradas";
  return "disponiveis";
}
