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
      { label: "Territórios", href: "/territorios", order: 5, active: true, featured: false },
      { label: "Fotógrafos", href: "/fotografos", order: 6, active: true, featured: false },
      { label: "Instituições", href: "/instituicoes", order: 7, active: true, featured: false },
      { label: "Agenda", href: "/agenda", order: 8, active: true, featured: false },
      { label: "Memórias", href: "/memorias", order: 9, active: true, featured: false },
      { label: "Acervo", href: "/acervo", order: 10, active: true, featured: false },
      { label: "Serviços", href: "/servicos", order: 11, active: true, featured: false },
      { label: "Planejar um registro", href: "/planejar-um-registro", order: 12, active: true, featured: true },
    ] },
    footer: { items: [{ label: "Sobre a Ojú", href: "/sobre" }, { label: "Comunidade", href: "/comunidade" }, { label: "Contato", href: "/contato" }, { label: "Redes sociais", href: "https://instagram.com/ojumidia", external: true }], legalItems: [{ label: "Privacidade" }, { label: "Termos" }] },
    method: { eyebrow: "Método Ojú", title: "Cuidado antes da câmera.", description: "Registrar começa quando a Ojú compreende o que está sendo vivido, o que precisa permanecer privado e o que pode atravessar o tempo.", items: ojuMethod },
  },
  Home: {
    hero: { eyebrow: "Histórias que pedem registro", title: "Memórias que conectam gerações", description: "Documentamos culturas afro-brasileiras, religiosidades de matriz africana e histórias que mantêm vivas as memórias dos nossos territórios — com contexto, crédito e autorização.", ctaLabel: "Planejar um registro", ctaHref: "/planejar-um-registro", secondaryLabel: "Explorar histórias", secondaryHref: "/historias" },
    planning: { title: "Sua história também merece ser registrada.", description: "A Ojú começa pela escuta do que precisa permanecer antes de propor fotografia, vídeo ou documentação integrada.", ctaLabel: "Planejar um registro", ctaHref: "/planejar-um-registro" },
    featured: { eyebrow: "Em destaque", title: "Histórias recentes", emptyMessage: "A Home mostra somente conteúdos escolhidos pela curadoria nacional.", allLabel: "Ver acervo", allHref: "/acervo" },
    editorialFronts: { items: [
      { label: "Documentários", title: "Filmes que contam nossas histórias", action: "Assistir agora", href: "/documentarios" },
      { label: "Coberturas", title: "Registro de eventos e celebrações", action: "Ver coberturas", href: "/coberturas" },
      { label: "Projetos", title: "Iniciativas que transformam", action: "Conhecer projetos", href: "/projetos" },
    ] },
  },
  "Histórias": {
    hero: { eyebrow: "Histórias", title: "Narrativas que olham para o território.", description: "Histórias não são conteúdo para preencher uma página. São registros editados para aproximar pessoas, tempos, lugares e as relações que os sustentam." },
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
    hero: { eyebrow: "Sobre a Ojú", title: "Documentar é cuidar do que continua.", description: "A Ojú Mídia produz narrativas documentais que conectam pessoas, territórios e tempos. Trabalhamos com texto, fotografia e audiovisual sem separar a imagem do contexto que a sustenta.", ctaLabel: "Planejar um registro", ctaHref: "/planejar-um-registro" },
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
