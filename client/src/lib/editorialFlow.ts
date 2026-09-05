export function nextEditorialAction(role: string | undefined, status: string) {
  const admin = role === "administrador" || role === "administrador principal";
  if (status === "Rascunho" && (admin || role === "criador" || role === "editor")) {
    return { label: "Enviar para revisão", hint: "A aprovação continua obrigatória antes de ir ao site." };
  }
  if (status === "Em revisão" && (admin || role === "aprovador")) {
    return { label: "Aprovar", hint: "Depois disto um administrador publica no site." };
  }
  if (status === "Aprovada" && admin) {
    return { label: "Publicar no site", hint: "Só nesta etapa o conteúdo entra no portal." };
  }
  return null;
}

export const editorialPipeline = ["Rascunho", "Em revisão", "Aprovada", "Publicada"] as const;
