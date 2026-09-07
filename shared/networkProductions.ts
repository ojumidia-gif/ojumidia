import { MAX_MINICLIP_DURATION_SECONDS, MAX_MINICLIPS, MAX_PHOTOS } from "./const";

export const productionStatuses = [
  "Planejada",
  "Confirmada",
  "Em produção",
  "Aguardando mídia",
  "Em revisão",
  "Concluída",
  "Cancelada",
] as const;

export type ProductionStatus = (typeof productionStatuses)[number];
export const productionMediaLayers = ["Operacional", "Editorial"] as const;
export type ProductionMediaLayer = (typeof productionMediaLayers)[number];

export const PRODUCTION_PHOTO_CAP = MAX_PHOTOS;
export const PRODUCTION_MINICLIP_CAP = MAX_MINICLIPS;
export const PRODUCTION_MINICLIP_SECONDS = MAX_MINICLIP_DURATION_SECONDS;

const ACTIVE_STATUSES = new Set<ProductionStatus>(["Planejada", "Confirmada", "Em produção", "Aguardando mídia", "Em revisão"]);

export function isProductionActive(status: string) {
  return ACTIVE_STATUSES.has(status as ProductionStatus);
}

export function canTransitionProduction(from: string, to: string) {
  const allowed: Record<string, string[]> = {
    Planejada: ["Confirmada", "Cancelada"],
    Confirmada: ["Em produção", "Cancelada"],
    "Em produção": ["Aguardando mídia", "Em revisão", "Cancelada"],
    "Aguardando mídia": ["Em revisão", "Em produção", "Cancelada"],
    "Em revisão": ["Concluída", "Aguardando mídia", "Cancelada"],
    Concluída: [],
    Cancelada: [],
  };
  return (allowed[from] || []).includes(to);
}

export function canAttachProductionMedia(status: string) {
  return status === "Confirmada" || status === "Em produção" || status === "Aguardando mídia";
}

export function canSubmitProductionForReview(status: string, attachedCount: number) {
  return (status === "Em produção" || status === "Aguardando mídia") && attachedCount > 0;
}

export function productionMediaWithinLimit(input: {
  mediaType: "foto" | "vídeo";
  durationSeconds?: number | null;
  attachedPhotoCount: number;
  attachedVideoCount: number;
}) {
  if (input.mediaType === "foto") {
    return { ok: input.attachedPhotoCount < PRODUCTION_PHOTO_CAP, message: `A janela da Rede aceita no máximo ${PRODUCTION_PHOTO_CAP} fotografias JPG por produção. Isto não é portfólio.` };
  }
  if (input.attachedVideoCount >= PRODUCTION_MINICLIP_CAP) {
    return { ok: false, message: `A janela da Rede aceita no máximo ${PRODUCTION_MINICLIP_CAP} miniclip por produção.` };
  }
  if (!input.durationSeconds || input.durationSeconds > PRODUCTION_MINICLIP_SECONDS) {
    return { ok: false, message: `O miniclip pode ter no máximo ${PRODUCTION_MINICLIP_SECONDS} segundos.` };
  }
  return { ok: true, message: "" };
}

export function mediaIsPublicByUploadAlone(_publicationAllowed: boolean) {
  return false;
}

export function productionCanMarkMediaPublic(input: {
  productionStatus: string;
  mediaPublicationAllowed: boolean;
  mediaAuthorization: string;
  portalAuthorization: boolean;
}) {
  if (input.productionStatus === "Cancelada") return false;
  if (input.mediaAuthorization === "Pendente") return false;
  if (!input.mediaPublicationAllowed) return false;
  if (!input.portalAuthorization) return false;
  return true;
}

export function frozenOpportunityFields() {
  return ["professionalValue", "ojuValue", "networkFundValue", "captorValue", "commercialPolicyId", "commercialPolicyVersion"] as const;
}

export function productionMineBucket(status: string) {
  if (status === "Planejada") return "planejadas";
  if (status === "Confirmada") return "confirmadas";
  if (status === "Em produção") return "emProducao";
  if (status === "Aguardando mídia" || status === "Em revisão") return "aguardandoMidia";
  if (status === "Concluída") return "concluidas";
  return "encerradas";
}
