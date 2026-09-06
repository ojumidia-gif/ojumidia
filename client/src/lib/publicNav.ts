export const OJU_WHATSAPP_URL = "https://wa.me/5592920019527";
export const OJU_WHATSAPP_LABEL = "(92) 92001-9527";
export const OJU_INSTAGRAM_HANDLE = "@oju.fotografia";
export const OJU_INSTAGRAM_URL = "https://instagram.com/oju.fotografia";
export const OJU_CONTACT_EMAIL = "ojumidia@gmail.com";

export const publicNavGroups = [
  {
    id: "olhar",
    label: "Olhar",
    description: "Histórias, imagens e filmes que a Ojú autorizou mostrar.",
    hrefs: ["/historias", "/coberturas", "/documentarios", "/projetos", "/fotografia-documental", "/acervo"],
  },
  {
    id: "chao",
    label: "Chão",
    description: "Territórios, casas, agendas, vozes e quem fotografa.",
    hrefs: ["/territorios", "/instituicoes", "/agenda", "/memorias", "/fotografos"],
  },
  {
    id: "chamar",
    label: "Chamar a Ojú",
    description: "Escuta, planejamento e registro com cuidado.",
    hrefs: ["/planejar-um-registro", "/ser-parceiro", "/servicos", "/contato"],
  },
] as const;

export type PublicNavLink = { label: string; href: string; featured?: boolean; order?: number; active?: boolean };

export function ensurePublicPartnerLink<T extends { href: string; label?: string }>(items: T[]): T[] {
  if (items.some(item => item.href === "/ser-parceiro")) return items;
  const extra = { href: "/ser-parceiro", label: "Ser parceiro" } as T;
  return [...items, extra];
}

export function groupPublicNav(links: PublicNavLink[]) {
  const byHref = new Map(links.map(item => [item.href, item]));
  const grouped = publicNavGroups.map(group => ({
    ...group,
    items: group.hrefs.map(href => byHref.get(href)).filter((item): item is PublicNavLink => Boolean(item)),
  })).filter(group => group.items.length > 0);
  const used = new Set(grouped.flatMap(group => group.items.map(item => item.href)));
  const rest = links.filter(item => !used.has(item.href));
  return { grouped, rest };
}
