export const ADMIN_QUIET_DAYS = 21;

export type AdminPulseCode = "convite" | "produzindo" | "em-movimento" | "quieto" | "fantasma" | "revogado";

export function classifyAdminPulse(input: {
  grantStatus: string;
  lastSignedIn?: Date | string | null;
  publicationCount: number;
  mediaCount: number;
  now?: Date;
}) {
  if (input.grantStatus === "Revogado") return { code: "revogado" as const, label: "Banido" };
  if (!input.lastSignedIn) return { code: "convite" as const, label: "Convite sem login" };
  const produced = input.publicationCount + input.mediaCount;
  const age = (input.now ?? new Date()).getTime() - new Date(input.lastSignedIn).getTime();
  const quiet = ADMIN_QUIET_DAYS * 24 * 60 * 60 * 1000;
  if (produced > 0 && age < quiet) return { code: "produzindo" as const, label: "Produzindo" };
  if (produced > 0) return { code: "quieto" as const, label: "Parou de produzir" };
  if (age < quiet) return { code: "em-movimento" as const, label: "Entrou, ainda sem conteúdo" };
  return { code: "fantasma" as const, label: "Acesso parado" };
}
