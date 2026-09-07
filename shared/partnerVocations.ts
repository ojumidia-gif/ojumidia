import { decodeSpecialties, specialtiesReceiveCoverageOffers, specialtyDoorKeys } from "./professionalSpecialties";

export const partnerVocations = [
  {
    id: "fotografo-videomaker",
    label: "Fotógrafo / videomaker",
    level: 1,
    summary: "Você atende pedidos de cobertura da Ojú na sua cidade.",
    preview: [
      "Quando alguém pede cobertura fotográfica ou de vídeo à Ojú na região que você escolheu, o pedido aparece no seu painel.",
      "Você pode aceitar, recusar ou não fazer nada.",
      "Se outra pessoa da mesma cidade aceitar, ou se o pedido expirar, ele some da sua lista.",
      "Aceitar não é emprego: segue conversa, proposta e contrato. Publicar no site só com autorização.",
    ],
    doors: ["ofertas", "fotografia", "coberturas", "midias", "fotografos"],
    receivesCoverageOffers: true,
  },
  {
    id: "historia-maker",
    label: "História maker",
    level: 2,
    summary: "Você conta e publica histórias da sua cidade no portal.",
    preview: [
      "No painel você cria história: texto, cidade e capa, até publicar em /historias.",
      "Não recebe sozinho os pedidos pagos de cobertura fotográfica — isso é do fotógrafo / videomaker.",
      "Se você também fotografa, marque os dois ofícios: o painel junta as duas rotas.",
    ],
    doors: ["historias", "coberturas"],
    receivesCoverageOffers: false,
  },
  {
    id: "midia-equipe",
    label: "Casa de mídia / equipe",
    level: 3,
    summary: "Acesso amplo: várias frentes, créditos de equipe e projetos da cidade.",
    preview: [
      "Para quem já opera como mídia, coletivo ou equipe — não só uma pessoa com uma câmera.",
      "Histórias, coberturas, documentários, projetos, fotografia, casas e créditos de equipe.",
      "Também vê pedidos de cobertura da região, para a equipe aceitar ou recusar.",
      "Ainda assim: sem Home nacional, sem CMS do site. Isso fica com a Equipe Ojú.",
    ],
    doors: ["ofertas", "historias", "coberturas", "documentarios", "projetos", "fotografia", "casas", "midias", "fotografos", "equipes"],
    receivesCoverageOffers: true,
  },
] as const;

export type PartnerVocationId = (typeof partnerVocations)[number]["id"];
export type PartnerVocationLabel = (typeof partnerVocations)[number]["label"];

const LEGACY_FRONT_TO_VOCATION: Record<string, PartnerVocationId> = {
  Histórias: "historia-maker",
  Coberturas: "fotografo-videomaker",
  Documentários: "midia-equipe",
  Projetos: "midia-equipe",
  "Fotografia documental": "fotografo-videomaker",
  "Casas e instituições": "midia-equipe",
  Fotografia: "fotografo-videomaker",
  Vídeo: "fotografo-videomaker",
  "Produção territorial": "fotografo-videomaker",
  "Casa ou coletivo": "midia-equipe",
};

function vocationFromToken(token: string) {
  const trimmed = token.trim();
  const byLabel = partnerVocations.find(item => item.label === trimmed);
  if (byLabel) return byLabel;
  const byId = partnerVocations.find(item => item.id === trimmed);
  if (byId) return byId;
  const mapped = LEGACY_FRONT_TO_VOCATION[trimmed];
  return mapped ? partnerVocations.find(item => item.id === mapped) ?? null : null;
}

export function decodePartnerVocations(value: string | null | undefined) {
  const parts = String(value || "")
    .replace(/^Vocações:\s*/i, "")
    .replace(/^Frentes pedidas:\s*/i, "")
    .replace(/^Frentes:\s*/i, "")
    .split(/\s*·\s*|\s*,\s*/)
    .map(item => item.trim())
    .filter(Boolean);
  const ids = Array.from(new Set(parts.map(item => vocationFromToken(item)?.id).filter((item): item is PartnerVocationId => Boolean(item))));
  return ids.map(id => partnerVocations.find(item => item.id === id)!);
}

export function encodePartnerVocations(selected: Array<PartnerVocationId | PartnerVocationLabel | string>) {
  const vocations = decodePartnerVocations(selected.join(" · "));
  return vocations.map(item => item.label).join(" · ");
}

export function partnerVocationIds(selected: Array<PartnerVocationId | PartnerVocationLabel | string>) {
  return decodePartnerVocations(encodePartnerVocations(selected)).map(item => item.id);
}

export function partnerReceivesCoverageOffers(value: string | null | undefined) {
  const specialties = decodeSpecialties(value);
  if (specialties.length) return specialtiesReceiveCoverageOffers(specialties.map(item => item.id));
  return decodePartnerVocations(value).some(item => item.receivesCoverageOffers);
}

export function partnerDoorKeys(value: string | null | undefined) {
  const specialties = decodeSpecialties(value);
  if (specialties.length) return specialtyDoorKeys(specialties.map(item => item.id));
  const vocations = decodePartnerVocations(value);
  if (!vocations.length) return new Set(partnerVocations.find(item => item.id === "midia-equipe")!.doors);
  return new Set(vocations.flatMap(item => [...item.doors]));
}

export const partnerVocationLabels = partnerVocations.map(item => item.label) as [PartnerVocationLabel, ...PartnerVocationLabel[]];
