import { BookOpenText, BriefcaseBusiness, FilePenLine, Film, HeartHandshake, Home, Image, ListFilter, MapPinned, Settings, Sparkles, Trash2 } from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  principalOnly?: boolean;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Visão geral",
    items: [
      { label: "Painel", href: "/admin", icon: Home },
      { label: "Pendências", href: "/admin/pendencias", icon: ListFilter },
    ],
  },
  {
    id: "content",
    label: "Conteúdo",
    items: [
      { label: "Conteúdo", href: "/admin/publicacoes", icon: BookOpenText },
      { label: "Acervo", href: "/admin/midias", icon: Image },
      { label: "Miniclipes", href: "/admin/miniclipes", icon: Film, principalOnly: true },
      { label: "Curadoria nacional", href: "/admin/destaques", icon: Sparkles, principalOnly: true },
      { label: "Lixeira", href: "/admin/lixeira-editorial", icon: Trash2, principalOnly: true },
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
    items: [
      { label: "Solicitações", href: "/admin/solicitacoes", icon: BriefcaseBusiness },
    ],
  },
  {
    id: "community",
    label: "Comunidade",
    items: [
      { label: "Comunidade e cuidado", href: "/admin/comunidade", icon: HeartHandshake },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    items: [
      { label: "Conteúdo do portal", href: "/admin/conteudo-portal", icon: FilePenLine, principalOnly: true },
      { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
    ],
  },
];

export function visibleAdminNav(role: string | undefined) {
  const principal = role === "administrador principal";
  return adminNavGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.href === "/admin/publicacoes" && group.id === "system") return false;
        return principal || !item.principalOnly;
      }),
    }))
    .filter(group => group.items.length > 0);
}
