export const CONTENT_STATUS = [
  "Rascunho",
  "Em revisão",
  "Aprovada",
  "Publicada",
  "Arquivada",
] as const;

export const EDITORIAL_ROLES = [
  "criador",
  "editor",
  "aprovador",
  "administrador",
  "administrador principal",
] as const;

export type ContentStatus = (typeof CONTENT_STATUS)[number];
export type EditorialRole = (typeof EDITORIAL_ROLES)[number];

const transitions: Record<ContentStatus, ContentStatus | null> = {
  Rascunho: "Em revisão",
  "Em revisão": "Aprovada",
  Aprovada: "Publicada",
  Publicada: "Arquivada",
  Arquivada: null,
};

const transitionRoles: Record<ContentStatus, EditorialRole[]> = {
  Rascunho: ["criador", "editor", "administrador", "administrador principal"],
  "Em revisão": ["aprovador", "administrador", "administrador principal"],
  Aprovada: ["administrador", "administrador principal"],
  Publicada: ["editor", "administrador", "administrador principal"],
  Arquivada: [],
};

export function nextEditorialStatus(status: ContentStatus) {
  return transitions[status];
}

export function canAdvanceStatus(role: EditorialRole, status: ContentStatus) {
  return transitionRoles[status].includes(role);
}

export function canEditPublication(role: EditorialRole, status: ContentStatus) {
  if (role === "administrador" || role === "administrador principal") return true;
  if (status === "Rascunho") return role === "criador" || role === "editor";
  return status === "Em revisão" && role === "editor";
}

export function roleLabel(role: EditorialRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
