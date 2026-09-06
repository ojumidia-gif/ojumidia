import { BookOpenText, BriefcaseBusiness, Camera, FilePenLine, Film, HeartHandshake, Home, Image, LifeBuoy, ListFilter, MapPinned, Route, ScrollText, Settings, Sparkles, Trash2, Users, Wallet } from "lucide-react";

export type AdminNavItem = {
  label: string;
  partnerLabel?: string;
  principalLabel?: string;
  href: string;
  icon: typeof Home;
  principalOnly?: boolean;
  partnerHidden?: boolean;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  partnerLabel?: string;
  principalLabel?: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Visão geral",
    partnerLabel: "Início",
    items: [
      { label: "Painel", href: "/admin", icon: Home },
      { label: "Guia", href: "/admin/guia", icon: Route },
      { label: "Canal Ojú", principalLabel: "Caixa Canal Ojú", href: "/admin/canal", icon: LifeBuoy },
      { label: "Pendências", href: "/admin/pendencias", icon: ListFilter, partnerHidden: true },
    ],
  },
  {
    id: "content",
    label: "Operação editorial",
    partnerLabel: "Seu trabalho",
    items: [
      { label: "Conteúdos", partnerLabel: "Escrever", href: "/admin/publicacoes", icon: BookOpenText },
      { label: "Territórios", partnerLabel: "Lugares", href: "/admin/territorios", icon: MapPinned },
      { label: "Fotógrafos", href: "/admin/fotografos", icon: Camera },
      { label: "Acervo", partnerLabel: "Fotos", href: "/admin/midias", icon: Image },
      { label: "Miniclipes", href: "/admin/miniclipes", icon: Film },
      { label: "Equipes e créditos", partnerLabel: "Créditos", href: "/admin/equipes", icon: Users },
      { label: "Lixeira de mídia", href: "/admin/lixeira-midias", icon: Trash2, principalOnly: true },
      { label: "Curadoria nacional", href: "/admin/destaques", icon: Sparkles, principalOnly: true },
      { label: "Lixeira editorial", href: "/admin/lixeira-editorial", icon: Trash2, principalOnly: true },
    ],
  },
  {
    id: "partners",
    label: "Parceiros",
    items: [
      { label: "Parceiros Ojú", href: "/admin/parceiros", icon: MapPinned, principalOnly: true },
    ],
  },
  {
    id: "commercial",
    label: "Comercial",
    partnerLabel: "Pedidos",
    items: [
      { label: "Solicitações", partnerLabel: "Pedidos do território", href: "/admin/solicitacoes", icon: BriefcaseBusiness },
      { label: "Contratos", href: "/admin/contratos", icon: FilePenLine, partnerHidden: true },
      { label: "Meus ganhos", href: "/admin/ganhos", icon: Wallet, partnerHidden: true },
    ],
  },
  {
    id: "community",
    label: "Comunidade",
    partnerLabel: "Casa e cuidado",
    items: [
      { label: "Comunidade e cuidado", partnerLabel: "Casas, agenda, memórias", href: "/admin/comunidade", icon: HeartHandshake },
    ],
  },
  {
    id: "system",
    label: "O site",
    items: [
      { label: "Conteúdo do portal", href: "/admin/conteudo-portal", icon: FilePenLine, principalOnly: true },
      { label: "Auditoria", href: "/admin/auditoria", icon: ScrollText, principalOnly: true },
      { label: "Retenção e limpeza", href: "/admin/retencao", icon: Settings, principalOnly: true },
      { label: "Configurações", href: "/admin/configuracoes", icon: Settings, principalOnly: true },
    ],
  },
];

export const principalOnlyAdminPaths = [
  "/admin/destaques",
  "/admin/home-preview",
  "/admin/lixeira-editorial",
  "/admin/lixeira-midias",
  "/admin/retencao",
  "/admin/parceiros",
  "/admin/conteudo-portal",
  "/admin/auditoria",
  "/admin/colaboradores",
  "/admin/politicas-comerciais",
  "/admin/avisos-repasse",
  "/admin/anuncios",
  "/admin/receitas",
  "/admin/configuracoes",
  "/admin/taxonomias",
  "/admin/frentes",
] as const;

export const partnerHiddenAdminPaths = [
  "/admin/pendencias",
  "/admin/ganhos",
  "/admin/contratos",
] as const;

export function isPrincipalOnlyAdminPath(pathname: string) {
  return principalOnlyAdminPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export function isPartnerHiddenAdminPath(pathname: string) {
  return partnerHiddenAdminPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export function visibleAdminNav(role: string | undefined, partnerScoped = false) {
  const principal = role === "administrador principal";
  return adminNavGroups
    .map(group => ({
      ...group,
      label: partnerScoped ? (group.partnerLabel || group.label) : (principal ? (group.principalLabel || group.label) : group.label),
      items: group.items
        .filter(item => {
          if (item.principalOnly && !principal) return false;
          if (partnerScoped && item.partnerHidden) return false;
          return true;
        })
        .map(item => ({
          ...item,
          label: partnerScoped ? (item.partnerLabel || item.label) : (principal ? (item.principalLabel || item.label) : item.label),
        })),
    }))
    .filter(group => group.items.length > 0);
}
