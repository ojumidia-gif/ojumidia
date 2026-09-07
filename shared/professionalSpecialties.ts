export const professionalSpecialties = [
  { id: "fotografo", label: "Fotógrafo", summary: "Registra acontecimentos, pessoas, territórios e memórias por meio da fotografia." },
  { id: "videomaker", label: "Videomaker", summary: "Produz registros audiovisuais, cobertura e narrativas em vídeo." },
  { id: "jornalista", label: "Jornalista", summary: "Apura, entrevista, contextualiza e produz informação jornalística." },
  { id: "documentarista", label: "Documentarista", summary: "Desenvolve registros documentais aprofundados sobre pessoas, territórios, acontecimentos ou temas." },
  { id: "historymaker", label: "Historymaker", summary: "Trabalha com memória, história oral, testemunhos e construção de narrativas de memória." },
  { id: "pesquisador", label: "Pesquisador", summary: "Atua na pesquisa, levantamento, documentação e contextualização de informações." },
  { id: "produtor-cultural", label: "Produtor cultural", summary: "Articula pessoas, projetos, eventos e ações culturais." },
  { id: "criador-conteudo", label: "Criador de conteúdo", summary: "Produz conteúdos para meios digitais e plataformas de comunicação." },
  { id: "colaborador-editorial", label: "Colaborador editorial", summary: "Contribui com produção, revisão, curadoria ou apoio editorial." },
] as const;

export type ProfessionalSpecialtyId = (typeof professionalSpecialties)[number]["id"];
export type ProfessionalSpecialtyLabel = (typeof professionalSpecialties)[number]["label"];

export const professionalSpecialtyIds = professionalSpecialties.map(item => item.id) as [ProfessionalSpecialtyId, ...ProfessionalSpecialtyId[]];
export const professionalSpecialtyLabels = professionalSpecialties.map(item => item.label) as [ProfessionalSpecialtyLabel, ...ProfessionalSpecialtyLabel[]];

const BY_ID = new Map(professionalSpecialties.map(item => [item.id, item]));

const LEGACY_TOKEN_TO_SPECIALTIES: Record<string, ProfessionalSpecialtyId[]> = {
  Fotógrafo: ["fotografo"],
  Videomaker: ["videomaker"],
  Jornalista: ["jornalista"],
  Documentarista: ["documentarista"],
  Historymaker: ["historymaker"],
  Pesquisador: ["pesquisador"],
  "Produtor cultural": ["produtor-cultural"],
  "Criador de conteúdo": ["criador-conteudo"],
  "Colaborador editorial": ["colaborador-editorial"],
  "Fotógrafo / videomaker": ["fotografo", "videomaker"],
  "História maker": ["historymaker"],
  "Casa de mídia / equipe": ["criador-conteudo", "produtor-cultural"],
  Histórias: ["historymaker"],
  Coberturas: ["fotografo"],
  Documentários: ["documentarista"],
  Projetos: ["produtor-cultural"],
  "Fotografia documental": ["fotografo"],
  "Casas e instituições": ["produtor-cultural"],
  Fotografia: ["fotografo"],
  Vídeo: ["videomaker"],
  "Produção territorial": ["produtor-cultural"],
  "Casa ou coletivo": ["produtor-cultural"],
};

function specialtiesFromToken(token: string): ProfessionalSpecialtyId[] {
  const trimmed = token.trim();
  if (!trimmed) return [];
  if (BY_ID.has(trimmed as ProfessionalSpecialtyId)) return [trimmed as ProfessionalSpecialtyId];
  const byLabel = professionalSpecialties.find(item => item.label === trimmed);
  if (byLabel) return [byLabel.id];
  return LEGACY_TOKEN_TO_SPECIALTIES[trimmed] || [];
}

export function decodeSpecialties(value: string | null | undefined) {
  const parts = String(value || "")
    .replace(/^Vocações:\s*/i, "")
    .replace(/^Frentes pedidas:\s*/i, "")
    .replace(/^Frentes:\s*/i, "")
    .replace(/^Especialidades:\s*/i, "")
    .split(/\s*·\s*|\s*,\s*/)
    .map(item => item.trim())
    .filter(Boolean);
  const ids = Array.from(new Set(parts.flatMap(specialtiesFromToken)));
  return ids.map(id => BY_ID.get(id)!);
}

export function encodeSpecialties(selected: Array<ProfessionalSpecialtyId | ProfessionalSpecialtyLabel | string>) {
  return decodeSpecialties(selected.join(" · ")).map(item => item.label).join(" · ");
}

export function specialtyIdsOf(selected: Array<ProfessionalSpecialtyId | ProfessionalSpecialtyLabel | string> | string) {
  return decodeSpecialties(Array.isArray(selected) ? selected.join(" · ") : selected).map(item => item.id);
}

const COVERAGE_SPECIALTIES = new Set<ProfessionalSpecialtyId>(["fotografo", "videomaker", "produtor-cultural"]);

export function specialtiesReceiveCoverageOffers(ids: readonly string[]) {
  return ids.some(id => COVERAGE_SPECIALTIES.has(id as ProfessionalSpecialtyId));
}

const SPECIALTY_DOORS: Record<ProfessionalSpecialtyId, readonly string[]> = {
  fotografo: ["ofertas", "fotografia", "coberturas", "midias", "fotografos"],
  videomaker: ["ofertas", "coberturas", "midias"],
  jornalista: ["historias", "coberturas"],
  documentarista: ["documentarios", "coberturas"],
  historymaker: ["historias"],
  pesquisador: ["historias"],
  "produtor-cultural": ["projetos", "casas", "equipes", "coberturas"],
  "criador-conteudo": ["historias", "fotografia", "coberturas"],
  "colaborador-editorial": ["historias"],
};

export function specialtyDoorKeys(ids: readonly string[], hasOwnMedia = false) {
  const keys = new Set<string>();
  ids.forEach(id => {
    const doors = SPECIALTY_DOORS[id as ProfessionalSpecialtyId];
    doors?.forEach(door => keys.add(door));
  });
  if (hasOwnMedia) ["documentarios", "projetos", "casas", "equipes", "midias"].forEach(door => keys.add(door));
  if (!keys.size) ["historias", "coberturas", "fotografia", "midias"].forEach(door => keys.add(door));
  return keys;
}

export const networkBondsNow = [
  { id: "criador-parceiro", label: "Criador parceiro", summary: "Profissional da Rede Ojú na cidade autorizada. Não é emprego e não muda o site nacional." },
  { id: "parceiro-midia", label: "Parceiro de mídia", summary: "Você já tem veículo, página ou projeto próprio e quer integrar a Rede sem abandonar a marca." },
] as const;

export const networkBondsReserved = [
  { id: "colaborador-oju", label: "Colaborador Ojú", summary: "Equipe interna. Continua só no RBAC (criador, editor, aprovador). Não é especialidade." },
  { id: "parceiro-oju", label: "Parceiro Ojú", summary: "A célula territorial já é a tabela partners. Não duplicar como especialidade nem como users.role." },
  { id: "independente", label: "Profissional independente integrado", summary: "Reservado para fase posterior. Não criar permissão nova por causa do nome." },
  { id: "organizacao", label: "Organização / parceiro institucional", summary: "Reservado: reutilizar institutions, não inventar segundo cadastro." },
] as const;

export type NetworkBondNowId = (typeof networkBondsNow)[number]["id"];

export const networkBondNowIds = networkBondsNow.map(item => item.id) as [NetworkBondNowId, ...NetworkBondNowId[]];

export function resolveNetworkBond(input: { hasOwnMedia?: boolean; bond?: string | null }): NetworkBondNowId {
  if (input.bond === "parceiro-midia" || input.hasOwnMedia) return "parceiro-midia";
  return "criador-parceiro";
}

export function bondDoesNotChangeSpecialties() {
  return true;
}

export function specialtyGrantsPrivilege(_specialtyId: string, _privilege: string) {
  return false;
}

export function bondGrantsPrivilege(_bond: string, _privilege: string) {
  return false;
}

export function bondLabel(id: string | null | undefined) {
  return networkBondsNow.find(item => item.id === id)?.label
    || networkBondsReserved.find(item => item.id === id)?.label
    || (id === "parceiro-midia" ? "Parceiro de mídia" : "Criador parceiro");
}
