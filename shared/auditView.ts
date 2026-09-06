/** Rotina operacional: a trilha completa permanece gravada; a visão do painel esconde isto por padrão. */
export const routineAuditActions = [
  "upload-ready",
  "upload-session-cleaned",
  "media-purge-attempted",
  "login-success",
] as const;

export const auditActionLabels: Record<string, string> = {
  "login-success": "Login",
  "publication-created": "Rascunho criado",
  "publication-status-changed": "Etapa editorial",
  "publication-unpublished": "Retirado do portal",
  "publication-trashed": "Enviado à lixeira",
  "publication-restored-from-trash": "Restaurado da lixeira",
  "publication-permanently-purged": "Excluído em definitivo",
  "media-registered": "Mídia no Acervo",
  "media-approved": "Mídia aprovada",
  "media-rejected": "Mídia recusada",
  "media-updated": "Mídia atualizada",
  "media-archived": "Mídia arquivada",
  "media-trashed": "Mídia na lixeira",
  "media-purge-attempted": "Tentativa de expurgo de mídia",
  "media-permanently-purged": "Mídia excluída em definitivo",
  "upload-ready": "Arquivo pronto no storage",
  "upload-session-cleaned": "Sessão de upload limpa",
  "commercial-policy-created": "Política comercial criada",
  "commercial-policy-activated": "Política comercial ativada",
  "charge-recorded": "Cobrança registrada",
  "highlight-suggested": "Destaque sugerido",
  "highlight-approved": "Destaque aprovado",
  "highlight-rejected": "Destaque recusado",
  "team-archived": "Equipe arquivada",
  "team-restored": "Equipe restaurada",
  "team-removed": "Equipe excluída",
  "team-merged": "Equipes duplicadas unificadas",
  "join-request-reviewed": "Candidatura pública atualizada",
};

export function isRoutineAuditAction(action: string) {
  return (routineAuditActions as readonly string[]).includes(action);
}

export function labelAuditAction(action: string) {
  return auditActionLabels[action] || action;
}
