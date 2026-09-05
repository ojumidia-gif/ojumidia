export const publicNavigation = [
  { label: "Olhar", href: "/historias" },
  { label: "Chão", href: "/territorios" },
  { label: "Chamar a Ojú", href: "/planejar-um-registro" },
  { label: "Serviços", href: "/servicos" },
  { label: "Sobre", href: "/sobre" },
] as const;

export const ojuMethod = [
  {
    order: "01",
    title: "Escuta",
    description: "A conversa começa pela história, pelo território e pelos limites do que pode ou não ser registrado.",
  },
  {
    order: "02",
    title: "Pactuação",
    description: "Antes da produção, alinhamos presença, formato, pessoas envolvidas, prioridades e autorizações necessárias.",
  },
  {
    order: "03",
    title: "Presença",
    description: "A equipe acompanha com discrição e atenção. A câmera não conduz o momento: ela aprende a estar nele.",
  },
  {
    order: "04",
    title: "Montagem",
    description: "Fotografias, sons e palavras são organizados com cuidado para preservar relações, sentidos e créditos.",
  },
  {
    order: "05",
    title: "Memória autorizada",
    description: "A entrega pertence a quem contratou. Qualquer entrada no acervo público depende de autorização editorial expressa.",
  },
] as const;

export const ojuServices = [
  {
    title: "Registro documental de celebrações",
    description: "Para encontros e momentos que pedem atenção à atmosfera, à história e às orientações de quem os realiza.",
    formats: "Fotografia, vídeo curto ou cobertura integrada.",
  },
  {
    title: "Memória audiovisual de projetos",
    description: "Para iniciativas, coletivos e organizações que desejam tornar processos, pessoas e caminhos compreensíveis no tempo.",
    formats: "Entrevista, vídeo documental e coleção fotográfica.",
  },
  {
    title: "Coleção de fotografia documental",
    description: "Uma sequência visual contextualizada por título, local, data, crédito e biografia viva de cada imagem.",
    formats: "Até cinco fotografias no registro documental público, quando autorizado.",
  },
  {
    title: "Planejamento de registro",
    description: "Para quem ainda não sabe qual formato precisa e quer começar entendendo o que é essencial preservar.",
    formats: "Conversa inicial, proposta adequada e fluxo de produção.",
  },
] as const;

export const communityEntries = [
  {
    title: "Instituições e territórios",
    description: "Perfis e localizações aparecem somente no nível de visibilidade definido por cada instituição.",
    href: "/instituicoes",
  },
  {
    title: "Agenda compartilhada",
    description: "Encontros e atividades que receberam autorização para circular publicamente.",
    href: "/agenda",
  },
  {
    title: "Memórias orais",
    description: "Vozes e relatos que podem ser ouvidos no tempo e no território, sempre com consentimento.",
    href: "/memorias",
  },
  {
    title: "Cuidado e consentimento",
    description: "Informações sobre visibilidade, autorização e acolhimento reservado dentro da plataforma.",
    href: "/cuidado-e-consentimento",
  },
] as const;

export function isDocumentaryMemoryKind(kind: string) {
  return ["Cobertura", "Documentário", "Projeto", "Fotografia documental"].includes(kind);
}
