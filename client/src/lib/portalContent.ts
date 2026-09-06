import { useMemo } from "react";
import { communityEntries, ojuMethod, ojuServices } from "@/lib/publicArchitecture";
import { useEditorialLive } from "@/hooks/useEditorialLive";
import { trpc } from "@/lib/trpc";
import { isStaticFirebasePreview } from "@/lib/runtimeMode";

export const portalPages = ["Global", "Home", "Histórias", "Memórias Documentais", "Serviços", "Comunidade", "Sobre"] as const;
export type PortalPage = (typeof portalPages)[number];

export type MethodContent = { eyebrow: string; title: string; description: string; items: Array<{ order: string; title: string; description: string }> };
export type HeroContent = { eyebrow: string; title: string; description: string; ctaLabel?: string; ctaHref?: string; secondaryLabel?: string; secondaryHref?: string };

export const portalContentDefaults = {
  Global: {
    navigation: { items: [
      { label: "Histórias", href: "/historias", order: 1, active: true, featured: true },
      { label: "Coberturas", href: "/coberturas", order: 2, active: true, featured: false },
      { label: "Documentários", href: "/documentarios", order: 3, active: true, featured: false },
      { label: "Projetos", href: "/projetos", order: 4, active: true, featured: false },
      { label: "Fotografia documental", href: "/fotografia-documental", order: 5, active: true, featured: false },
      { label: "Territórios", href: "/territorios", order: 6, active: true, featured: false },
      { label: "Fotógrafos", href: "/fotografos", order: 7, active: true, featured: false },
      { label: "Instituições", href: "/instituicoes", order: 8, active: true, featured: false },
      { label: "Agenda", href: "/agenda", order: 9, active: true, featured: false },
      { label: "Memórias", href: "/memorias", order: 10, active: true, featured: false },
      { label: "Acervo", href: "/acervo", order: 11, active: true, featured: false },
      { label: "Serviços", href: "/servicos", order: 12, active: true, featured: false },
      { label: "Chamar a Ojú", href: "/planejar-um-registro", order: 13, active: true, featured: true },
      { label: "Ser parceiro", href: "/ser-parceiro", order: 14, active: true, featured: false },
    ] },
    footer: { items: [{ label: "Sobre a Ojú", href: "/sobre" }, { label: "Comunidade", href: "/comunidade" }, { label: "Contato", href: "/contato" }, { label: "Ser parceiro", href: "/ser-parceiro" }, { label: "Cuidado", href: "/cuidado-e-consentimento" }, { label: "Instagram", href: "https://instagram.com/oju.fotografia", external: true }], legalItems: [{ label: "Termos de uso", href: "/termos-de-uso" }, { label: "Privacidade e LGPD", href: "/privacidade" }, { label: "Cuidado e consentimento", href: "/cuidado-e-consentimento" }] },
    method: { eyebrow: "Método Ojú", title: "Cuidado antes da câmera.", description: "Registrar começa quando a Ojú compreende o que está sendo vivido, o que precisa permanecer privado e o que pode atravessar o tempo.", items: ojuMethod },
  },
  Home: {
    hero: { eyebrow: "Ojú: o olhar que registra", title: "Memória negra, casa e chão que não se apaga.", description: "Documentamos culturas afro-brasileiras, religiosidades de matriz africana e os territórios que as sustentam — com contexto, crédito e autorização. O sagrado só entra quando a casa autoriza.", ctaLabel: "Chamar a Ojú", ctaHref: "/planejar-um-registro", secondaryLabel: "Olhar histórias", secondaryHref: "/historias" },
    planning: { title: "Sua história também merece ser registrada.", description: "A Ojú começa pela escuta do que precisa permanecer antes de propor fotografia, vídeo ou documentação integrada.", ctaLabel: "Chamar a Ojú", ctaHref: "/planejar-um-registro" },
    featured: { eyebrow: "Em destaque", title: "Histórias recentes", emptyMessage: "A Home mostra somente conteúdos escolhidos pela curadoria nacional. Publicar no portal não coloca a capa aqui.", allLabel: "Ir ao acervo", allHref: "/acervo" },
    editorialFronts: { items: [
      { label: "Documentários", title: "Filmes que contam nossas histórias", action: "Assistir agora", href: "/documentarios" },
      { label: "Coberturas", title: "Registro de eventos e celebrações", action: "Ver coberturas", href: "/coberturas" },
      { label: "Projetos", title: "Iniciativas que transformam", action: "Conhecer projetos", href: "/projetos" },
      { label: "Fotografia", title: "Coleções com território e biografia viva", action: "Ver coleções", href: "/fotografia-documental" },
    ] },
  },
  "Histórias": {
    hero: { eyebrow: "Olhar", title: "Narrativas que olham para o território.", description: "Histórias não são conteúdo para preencher uma página. São registros editados para aproximar pessoas, tempos, casas e o chão que os sustenta." },
  },
  "Memórias Documentais": {
    hero: { eyebrow: "Memórias documentais", title: "Registros que encontram um lugar na memória coletiva.", description: "Esta não é uma vitrine de serviços. É uma seleção de registros que podem ser vistos porque foram publicados com contexto, crédito e autorização adequada." },
  },
  "Serviços": {
    hero: { eyebrow: "Serviços e processos", title: "Registrar não é acumular imagens.", description: "A Ojú começa pela escuta do que precisa ser preservado antes de definir uma produção. O formato nasce do contexto, dos limites e da história — não de um catálogo impessoal." },
    offers: { eyebrow: "Formas de registro", title: "O formato acompanha a história.", items: ojuServices },
  },
  "Comunidade": {
    hero: { eyebrow: "Comunidade", title: "Uma plataforma que aproxima sem expor.", description: "A Ojú organiza caminhos para encontrar instituições, acompanhar agendas, escutar memórias e acessar informações de cuidado. Cada presença pública respeita o nível de visibilidade escolhido por quem participa." },
    entries: { items: communityEntries },
  },
  "Sobre": {
    hero: { eyebrow: "Sobre a Ojú", title: "Documentar é cuidar do que continua.", description: "A Ojú Mídia produz narrativas documentais que conectam pessoas, territórios e tempos. Trabalhamos com texto, fotografia e audiovisual sem separar a imagem do contexto que a sustenta.", ctaLabel: "Chamar a Ojú", ctaHref: "/planejar-um-registro" },
  },
} as const;

function parseObject(value: string | null) {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function usePortalContent(page: PortalPage) {
  const utils = trpc.useUtils();
  const query = trpc.portalContent.publicByPage.useQuery({ page }, { enabled: !isStaticFirebasePreview, refetchInterval: 30000 });
  useEditorialLive(() => { utils.portalContent.publicByPage.invalidate({ page }); });
  const byKey = useMemo(() => new Map((query.data || []).map(item => [item.sectionKey, item])), [query.data]);
  return {
    loading: query.isLoading,
    block<T extends Record<string, unknown>>(key: string, fallback: T): T | null {
      const record = byKey.get(key);
      if (!record) return fallback;
      if (!record.isVisible || record.deletedAt) return null;
      return { ...fallback, ...parseObject(record.contentJson) } as T;
    },
  };
}
