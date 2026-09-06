export function nextEditorialAction(role: string | undefined, status: string) {
  const admin = role === "administrador" || role === "administrador principal";
  if (status === "Rascunho" && (admin || role === "criador" || role === "editor")) {
    return { label: "Enviar para revisão", hint: "A aprovação continua obrigatória antes de ir ao site." };
  }
  if (status === "Em revisão" && (admin || role === "aprovador")) {
    return { label: "Aprovar", hint: "Depois disto um administrador publica no site." };
  }
  if (status === "Aprovada" && admin) {
    return { label: "Publicar no site", hint: "Entra no portal. Histórias recentes na Home continua sendo escolha da curadoria." };
  }
  return null;
}

export function publicationSiteGaps(data: {
  body?: string | null;
  summary?: string | null;
  teamCredit?: string | null;
  media: Array<{ isCover?: boolean }>;
  taxonomies: Array<{ dimension: string }>;
}) {
  const gaps: string[] = [];
  if (!(data.body || data.summary)?.trim()) gaps.push("Falta o texto que o site vai ler.");
  if (!data.teamCredit?.trim()) gaps.push("Falta o crédito de quem fez.");
  if (!data.media.length) gaps.push("Falta foto ou vídeo autorizado.");
  else if (!data.media.some(item => item.isCover)) gaps.push("Marque a foto de capa.");
  if (!data.taxonomies.some(item => item.dimension === "Território")) gaps.push("Ligue a um território.");
  return gaps;
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
