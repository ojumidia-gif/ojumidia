import { portalContentPages } from "../drizzle/schema";

type PortalPage = (typeof portalContentPages)[number];

export const PORTAL_DEFAULT_BLOCKS: Array<{
  page: PortalPage;
  sectionKey: string;
  label: string;
  displayOrder: number;
  content: Record<string, unknown>;
}> = [
  {
    page: "Global",
    sectionKey: "navigation",
    label: "Navegação pública",
    displayOrder: 10,
    content: { items: [
      { label: "Histórias", href: "/historias", order: 1, active: true, featured: true },
      { label: "Coberturas", href: "/coberturas", order: 2, active: true, featured: false },
      { label: "Documentários", href: "/documentarios", order: 3, active: true, featured: false },
      { label: "Projetos", href: "/projetos", order: 4, active: true, featured: false },
      { label: "Territórios", href: "/territorios", order: 5, active: true, featured: false },
      { label: "Fotógrafos", href: "/fotografos", order: 6, active: true, featured: false },
      { label: "Instituições", href: "/instituicoes", order: 7, active: true, featured: false },
      { label: "Agenda", href: "/agenda", order: 8, active: true, featured: false },
      { label: "Memórias", href: "/memorias", order: 9, active: true, featured: false },
      { label: "Acervo", href: "/acervo", order: 10, active: true, featured: false },
      { label: "Serviços", href: "/servicos", order: 11, active: true, featured: false },
      { label: "Chamar a Ojú", href: "/planejar-um-registro", order: 12, active: true, featured: true },
    ] },
  },
  {
    page: "Global",
    sectionKey: "footer",
    label: "Rodapé",
    displayOrder: 20,
    content: { items: [{ label: "Sobre a Ojú", href: "/sobre" }, { label: "Comunidade", href: "/comunidade" }, { label: "Contato", href: "/contato" }, { label: "Cuidado", href: "/cuidado-e-consentimento" }, { label: "Instagram", href: "https://instagram.com/oju.fotografia", external: true }], legalItems: [{ label: "Cuidado e consentimento", href: "/cuidado-e-consentimento" }] },
  },
  {
    page: "Global",
    sectionKey: "method",
    label: "Método Ojú",
    displayOrder: 30,
    content: { eyebrow: "Método Ojú", title: "Cuidado antes da câmera.", description: "Registrar começa quando a Ojú compreende o que está sendo vivido.", items: [] },
  },
  {
    page: "Home",
    sectionKey: "hero",
    label: "Abertura da Home",
    displayOrder: 10,
    content: { eyebrow: "Ojú: o olhar que registra", title: "Memória negra, casa e chão que não se apaga.", description: "Documentamos culturas afro-brasileiras, religiosidades de matriz africana e os territórios que as sustentam — com contexto, crédito e autorização.", ctaLabel: "Chamar a Ojú", ctaHref: "/planejar-um-registro", secondaryLabel: "Olhar histórias", secondaryHref: "/historias" },
  },
  {
    page: "Home",
    sectionKey: "planning",
    label: "Convite para planejar registro",
    displayOrder: 20,
    content: { title: "Sua história também merece ser registrada.", description: "A Ojú começa pela escuta do que precisa permanecer.", ctaLabel: "Chamar a Ojú", ctaHref: "/planejar-um-registro" },
  },
  {
    page: "Home",
    sectionKey: "featured",
    label: "Destaques da Home",
    displayOrder: 30,
    content: { eyebrow: "Em destaque", title: "Histórias recentes", emptyMessage: "A Home mostra somente conteúdos escolhidos pela curadoria nacional.", allLabel: "Ver acervo", allHref: "/acervo" },
  },
  {
    page: "Home",
    sectionKey: "editorialFronts",
    label: "Frentes editoriais da Home",
    displayOrder: 40,
    content: { items: [
      { label: "Documentários", title: "Filmes que contam nossas histórias", action: "Assistir agora", href: "/documentarios" },
      { label: "Coberturas", title: "Registro de eventos e celebrações", action: "Ver coberturas", href: "/coberturas" },
      { label: "Projetos", title: "Iniciativas que transformam", action: "Conhecer projetos", href: "/projetos" },
    ] },
  },
  {
    page: "Histórias",
    sectionKey: "hero",
    label: "Abertura de Histórias",
    displayOrder: 10,
    content: { eyebrow: "Histórias", title: "Narrativas que olham para o território.", description: "Histórias são registros editados para aproximar pessoas, tempos e lugares." },
  },
  {
    page: "Memórias Documentais",
    sectionKey: "hero",
    label: "Abertura de Memórias",
    displayOrder: 10,
    content: { eyebrow: "Memórias documentais", title: "Registros que encontram um lugar na memória coletiva.", description: "Seleção de registros publicados com contexto, crédito e autorização." },
  },
  {
    page: "Serviços",
    sectionKey: "hero",
    label: "Abertura de Serviços",
    displayOrder: 10,
    content: { eyebrow: "Serviços e processos", title: "Registrar não é acumular imagens.", description: "A Ojú começa pela escuta do que precisa ser preservado." },
  },
  {
    page: "Comunidade",
    sectionKey: "hero",
    label: "Abertura da Comunidade",
    displayOrder: 10,
    content: { eyebrow: "Comunidade", title: "Uma plataforma que aproxima sem expor.", description: "Caminhos para instituições, agendas, memórias e cuidado, com visibilidade escolhida." },
  },
  {
    page: "Sobre",
    sectionKey: "hero",
    label: "Abertura Sobre a Ojú",
    displayOrder: 10,
    content: { eyebrow: "Sobre a Ojú", title: "Documentar é cuidar do que continua.", description: "A Ojú Mídia produz narrativas documentais que conectam pessoas, territórios e tempos.", ctaLabel: "Planejar um registro", ctaHref: "/planejar-um-registro" },
  },
];
