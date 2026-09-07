export function canPublishStraight(role: string | undefined) {
  return role === "administrador" || role === "administrador principal";
}

export function nextEditorialAction(role: string | undefined, status: string) {
  if (canPublishStraight(role) && (status === "Rascunho" || status === "Em revisão" || status === "Aprovada")) {
    return { label: "Publicar no site", hint: "Entra no portal. A Home nacional continua com a Equipe Ojú." };
  }
  if (status === "Rascunho" && (role === "criador" || role === "editor")) {
    return { label: "Pedir revisão", hint: "Um aprovador ou criador parceiro libera depois para o site." };
  }
  if (status === "Em revisão" && (role === "aprovador" || canPublishStraight(role))) {
    return { label: "Aprovar", hint: "Depois um criador parceiro publica no site." };
  }
  if (status === "Aprovada" && canPublishStraight(role)) {
    return { label: "Publicar no site", hint: "Entra no portal. A Home nacional continua com a Equipe Ojú." };
  }
  return null;
}

export function publicationSiteGaps(data: {
  body?: string | null;
  summary?: string | null;
  media: Array<{ isCover?: boolean }>;
  taxonomies: Array<{ dimension: string }>;
}) {
  const gaps: string[] = [];
  if (!(data.body || data.summary)?.trim()) gaps.push("Falta o texto que o site vai ler.");
  if (!data.taxonomies.some(item => item.dimension === "Território")) gaps.push("Ligue a uma cidade de atuação.");
  if (!data.media.length) gaps.push("Falta foto ou vídeo autorizado.");
  else if (!data.media.some(item => item.isCover)) gaps.push("Marque a foto de capa.");
  return gaps;
}

export function publishWizardStep(gaps: string[]): 1 | 2 | 3 {
  if (gaps.some(item => item.includes("texto"))) return 1;
  if (gaps.some(item => item.includes("cidade"))) return 2;
  return 3;
}

export function photographerSiteGaps(item: { publicVisible?: boolean; profileNote?: string | null }) {
  const gaps: string[] = [];
  if (!item.profileNote?.trim()) gaps.push("Falta apresentação curta para o portal.");
  if (!item.publicVisible) gaps.push("Ainda fora de /fotografos.");
  return gaps;
}

export function mediaSiteGaps(item: { credit?: string | null; publicationAllowed?: boolean; authorization?: string; uploadStatus?: string }) {
  const gaps: string[] = [];
  if (!item.credit?.trim()) gaps.push("Falta crédito.");
  if (item.authorization === "Pendente") gaps.push("Autorização pendente.");
  if (!item.publicationAllowed) gaps.push("Publicação no portal ainda não permitida.");
  if (item.uploadStatus === "Pronto") gaps.push("Aprovar para ligar ao conteúdo.");
  return gaps;
}

export function communityNextStep(consentStatus: string, status: string) {
  if (consentStatus !== "Autorizado") return { label: "Registrar consentimento", hint: "No card: Autorizar e publicar no site." };
  if (status !== "Publicada") return { label: "Publicar no site", hint: "No card: Publicar no site." };
  return { label: "No site", hint: "No site, com autorização." };
}

export const editorialPipeline = ["Rascunho", "Em revisão", "Aprovada", "Publicada"] as const;
export const publishWizardLabels = ["Texto", "Cidade", "Capa e publicar"] as const;
