import { MAX_MINICLIPS, MAX_PHOTOS } from "./const";

export const MEDIA_IN_PUBLIC_USE_ARCHIVE_MESSAGE =
  "Esta mídia está sendo utilizada por conteúdo publicado. Remova ou substitua o vínculo antes de retirá-la de uso.";

export type AcervoSituation = "ainda-sem-conteudo" | "ligada" | "fora-de-uso" | "lixeira";

export type AcervoUsage = {
  kind: string;
  id: number;
  label: string;
  title?: string | null;
  contentKind?: string | null;
};

export function acervoSituation(item: { state: string; deletedAt?: Date | string | null; usageCount: number }): AcervoSituation {
  if (item.deletedAt) return "lixeira";
  if (item.state !== "Ativo") return "fora-de-uso";
  return item.usageCount > 0 ? "ligada" : "ainda-sem-conteudo";
}

export function acervoUsageKindLabel(usage: Pick<AcervoUsage, "kind" | "contentKind">) {
  if (usage.kind === "publicationMedia") {
    if (usage.contentKind === "História") return "História";
    if (usage.contentKind === "Cobertura") return "Cobertura";
    if (usage.contentKind === "Documentário") return "Documentário";
    if (usage.contentKind === "Projeto") return "Projeto";
    if (usage.contentKind === "Fotografia documental") return "Fotografia documental";
    return "Publicação";
  }
  if (usage.kind === "networkProductionMedia") return "Produção da Rede";
  if (usage.kind === "taxonomyMedia") return "Taxonomia";
  if (usage.kind.startsWith("partners.")) return "Parceiro";
  if (usage.kind.startsWith("institutions.")) return "Instituição";
  if (usage.kind.startsWith("communityEvents.")) return "Agenda";
  if (usage.kind.startsWith("oralMemories.")) return "Memória";
  if (usage.kind.startsWith("commercialMiniclips.")) return "Miniclip comercial";
  if (usage.kind.startsWith("revenueLeads.")) return "Licenciamento";
  return "Conteúdo";
}

export function acervoLinkedSummary(usages: AcervoUsage[]) {
  if (!usages.length) return "Ainda sem conteúdo";
  if (usages.length === 1) {
    const usage = usages[0];
    const name = usage.title?.trim() || usage.label;
    return `Ligada a ${acervoUsageKindLabel(usage)}: ${name}`;
  }
  return `Ligada a ${usages.length} conteúdos`;
}

export function acervoSituationLabel(situation: AcervoSituation, usages: AcervoUsage[] = []) {
  if (situation === "ainda-sem-conteudo") return "Ainda sem conteúdo";
  if (situation === "ligada") return acervoLinkedSummary(usages);
  if (situation === "fora-de-uso") return "Fora de uso";
  return "Na lixeira";
}

export function occupancyCopy(input: { mediaType: "foto" | "vídeo"; used: number; cap: number; destination?: "publication" | "production" }) {
  const unit = input.mediaType === "foto" ? "fotografias" : "miniclipes";
  const subject = input.destination === "production" ? "produção" : "publicação";
  if (input.used >= input.cap) {
    return {
      ok: false,
      message: input.mediaType === "foto"
        ? `Esta ${subject} já atingiu o limite de ${input.cap} fotografias.`
        : `Esta ${subject} já atingiu o limite de ${input.cap} miniclip.`,
    };
  }
  return { ok: true, message: `${input.used} de ${input.cap} ${unit} utilizadas` };
}

export function publicationOccupancyCaps(contentKind: string, photoLimit: number | null, videoLimit: number | null) {
  const photoCap = contentKind === "Fotografia documental" ? Math.min(photoLimit ?? MAX_PHOTOS, MAX_PHOTOS) : Math.min(photoLimit ?? MAX_PHOTOS, MAX_PHOTOS);
  const videoCap = contentKind === "Fotografia documental" ? 0 : Math.min(videoLimit ?? MAX_MINICLIPS, MAX_MINICLIPS);
  return { photoCap, videoCap };
}

export function mediaReadyToLinkEditorial(item: {
  state: string;
  deletedAt?: Date | string | null;
  publicationAllowed: boolean;
  uploadStatus: string;
}) {
  if (item.deletedAt) return { ok: false as const, reason: "Mídia na lixeira não pode ser ligada." };
  if (item.state !== "Ativo") return { ok: false as const, reason: "Mídia fora de uso não pode ser ligada. Reative-a antes." };
  if (!item.publicationAllowed) return { ok: false as const, reason: "Esta mídia não está autorizada para publicação." };
  if (!["Aprovado", "Publicado"].includes(item.uploadStatus)) return { ok: false as const, reason: "Aprove a mídia antes de ligá-la a uma publicação." };
  return { ok: true as const };
}

export function mediaReadyToLinkProduction(item: { state: string; deletedAt?: Date | string | null }) {
  if (item.deletedAt) return { ok: false as const, reason: "Mídia na lixeira não pode ser ligada." };
  if (item.state !== "Ativo") return { ok: false as const, reason: "Mídia fora de uso não pode ser ligada. Reative-a antes." };
  return { ok: true as const };
}

export function actorCanEditPublication(role: string | undefined, status: string) {
  if (role === "administrador" || role === "administrador principal") return true;
  if (status === "Rascunho") return role === "criador" || role === "editor";
  return status === "Em revisão" && role === "editor";
}
