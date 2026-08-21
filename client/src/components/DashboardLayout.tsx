import { useAuth } from "@/_core/hooks/useAuth";
import { OjuMark } from "@/components/PublicHeader";
import { startLogin } from "@/const";
import { Archive, BookOpenText, FolderKanban, Home, Image, Layers3, LogOut, MapPinned, Settings, Sparkles, Users, X, BriefcaseBusiness, BadgeDollarSign, FileSignature, Film, HandCoins, HeartHandshake, Landmark, Mic2, BellRing, FilePenLine, CalendarClock, UserCog, WalletCards, Scale, Trash2, ListFilter } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { isStaticFirebasePreview } from "@/lib/runtimeMode";

const entries = [
  { label: "Painel central", href: "/admin", icon: Home },
  { label: "Pendências", href: "/admin/pendencias", icon: ListFilter },
  { label: "Conteúdos", href: "/admin/publicacoes", icon: BookOpenText },
  { label: "Lixeira Editorial", href: "/admin/lixeira-editorial", icon: Trash2 },
  { label: "Frentes editoriais", href: "/admin/frentes", icon: Layers3 },
  { label: "Acervo", href: "/admin/midias", icon: Image },
  { label: "Territórios", href: "/admin/taxonomias", icon: MapPinned },
  { label: "Curadoria", href: "/admin/destaques", icon: Sparkles },
  { label: "Miniclipes", href: "/admin/miniclipes", icon: Film },
  { label: "Solicitações", href: "/admin/solicitacoes", icon: BriefcaseBusiness },
  { label: "Contratos", href: "/admin/contratos", icon: FileSignature },
  { label: "Monetização", href: "/admin/anuncios", icon: BadgeDollarSign },
  { label: "Ganhos e repasses", href: "/admin/ganhos", icon: WalletCards },
  { label: "Avisos de repasse", href: "/admin/avisos-repasse", icon: BellRing },
  { label: "Políticas comerciais", href: "/admin/politicas-comerciais", icon: Scale },
  { label: "Receitas documentais", href: "/admin/receitas", icon: HandCoins },
  { label: "Comunidade e cuidado", href: "/admin/comunidade", icon: HeartHandshake },
  { label: "Cadastrar instituição", href: "/admin/nova-instituicao", icon: Landmark },
  { label: "Visibilidade institucional", href: "/admin/visibilidade-institucional", icon: CalendarClock },
  { label: "Enviar memória oral", href: "/admin/nova-memoria-oral", icon: Mic2 },
  { label: "Revisar memórias assistidas", href: "/admin/revisar-memorias", icon: FilePenLine },
  { label: "Notificações de acolhimento", href: "/admin/notificacoes-acolhimento", icon: BellRing },
  { label: "Distribuições comunitárias", href: "/admin/distribuicoes-comunidade", icon: BriefcaseBusiness },
  { label: "Equipes", href: "/admin/equipes", icon: Users },
  { label: "Colaboradores", href: "/admin/colaboradores", icon: UserCog },
  { label: "Conteúdo do portal", href: "/admin/conteudo-portal", icon: FilePenLine },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, error: authError, refresh } = useAuth();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [localDevEnabled, setLocalDevEnabled] = useState(false);
  useEffect(() => {
    fetch("/api/local-dev/status", { cache: "no-store" })
      .then(async response => response.ok ? response.json() as Promise<{ enabled: boolean }> : { enabled: false })
      .then(data => setLocalDevEnabled(Boolean(data.enabled)))
      .catch(() => setLocalDevEnabled(false));
  }, []);
  useEffect(() => {
    if (!loading && !user && localDevEnabled && location !== "/admin/acesso-local") setLocation("/admin/acesso-local");
  }, [loading, localDevEnabled, location, setLocation, user]);
  if (loading) return <div className="min-h-screen bg-[#f2efe7]" />;
  if (isStaticFirebasePreview) return <main className="min-h-screen bg-[#242017] px-5 text-[#f7f5ef] grid place-items-center"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-full border border-[#f6b71b]/50 p-4"><Layers3 className="h-7 w-7 text-[#f6b71b]" /></div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f6b71b]">Prévia visual do Firebase</p><h1 className="mt-3 font-serif text-4xl">Centro Administrativo indisponível</h1><p className="mt-4 leading-7 text-[#ded8ca]">Este domínio exibe somente o portal público estático. O Centro Administrativo exige o servidor seguro da Ojú para autenticação, permissões, documentos e dados.</p><p className="mt-3 text-sm leading-6 text-[#aaa190]">Use o ambiente local para testar a operação completa ou aguarde a implantação com servidor compatível.</p><Link href="/" className="mt-8 inline-flex items-center rounded-md bg-[#f6b71b] px-4 py-2 text-sm font-medium text-[#242017] hover:bg-[#f3c449]">Voltar ao portal</Link></section></main>;
  if (authError) return <main className="min-h-screen bg-[#242017] px-5 text-[#f7f5ef] grid place-items-center"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-full border border-[#f6b71b]/50 p-4"><Layers3 className="h-7 w-7 text-[#f6b71b]" /></div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f6b71b]">Serviço administrativo indisponível</p><h1 className="mt-3 font-serif text-4xl">Centro Administrativo Ojú</h1><p className="mt-4 leading-7 text-[#ded8ca]">Esta prévia não conseguiu alcançar a API segura que valida sessões, permissões e documentos protegidos.</p><p className="mt-3 text-sm leading-6 text-[#aaa190]">Uma implantação estática no Firebase Hosting exibe o portal, mas não executa o servidor Express da Ojú. Para acessar o Centro Administrativo, use o ambiente local ou a publicação completa com servidor configurado.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button onClick={() => refresh()} className="bg-[#f6b71b] text-[#242017] hover:bg-[#f3c449]">Tentar novamente</Button><Link href="/" className="inline-flex items-center rounded-md border border-[#f6b71b]/70 px-4 py-2 text-sm font-medium text-[#f6b71b] hover:bg-[#f6b71b] hover:text-[#242017]">Voltar ao portal</Link></div></section></main>;
  if (!user) return <main className="min-h-screen bg-[#242017] px-5 text-[#f7f5ef] grid place-items-center"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-full bg-[#f6b71b] p-4"><Layers3 className="h-7 w-7 text-[#242017]" /></div><h1 className="font-serif text-4xl">Centro Administrativo Ojú</h1><p className="mt-4 leading-7 text-[#ded8ca]">Entre com sua conta autorizada para administrar a operação editorial da Ojú Mídia.</p><Button onClick={() => startLogin()} className="mt-8 bg-[#f6b71b] text-[#242017] hover:bg-[#f3c449]">Autenticar para continuar</Button></section></main>;
  if (!user.adminAccess) return <main className="min-h-screen bg-[#242017] px-5 text-[#f7f5ef] grid place-items-center"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-full border border-[#f6b71b]/50 p-4"><Layers3 className="h-7 w-7 text-[#f6b71b]" /></div><h1 className="font-serif text-4xl">Acesso não autorizado</h1><p className="mt-4 leading-7 text-[#ded8ca]">Sua sessão está ativa, mas esta conta não foi autorizada individualmente para o Centro Administrativo.</p><Button onClick={logout} variant="outline" className="mt-8 border-[#f6b71b] text-[#f6b71b] hover:bg-[#f6b71b] hover:text-[#242017]">Sair desta conta</Button></section></main>;
  const Sidebar = () => <aside className="flex h-full w-[272px] flex-col bg-[#242017] p-5 text-[#eae4d7]"><div className="mb-9"><OjuMark compact /></div><p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#aaa190]">Operação editorial</p><nav className="space-y-1">{entries.filter(entry => entry.href !== "/admin/lixeira-editorial" || user.role === "administrador principal").map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${location === href ? "bg-[#f6b71b] font-semibold text-[#242017]" : "text-[#d9d1c3] hover:bg-white/10"}`}><Icon className="h-4 w-4" />{label}</Link>)}</nav><div className="mt-auto border-t border-white/10 pt-4"><p className="px-2 text-sm font-medium">{user.name || "Equipe Ojú"}</p><p className="px-2 pt-1 text-xs capitalize text-[#aaa190]">{user.role}</p><button onClick={logout} className="mt-4 flex items-center gap-3 px-2 text-sm text-[#d9d1c3] hover:text-white"><LogOut className="h-4 w-4" />Sair</button></div></aside>;
  return <div className="min-h-screen bg-[#f2efe7] text-[#242017]"><div className="fixed inset-y-0 left-0 z-30 hidden lg:block"><Sidebar /></div>{open && <div className="fixed inset-0 z-50 bg-black/45 lg:hidden"><div className="h-full"><Sidebar /></div><button onClick={() => setOpen(false)} className="absolute right-5 top-5 rounded-full bg-white p-2"><X className="h-5 w-5" /></button></div>}<div className="min-h-screen lg:pl-[272px]"><header className="flex h-[68px] items-center justify-between border-b border-[#242017]/10 bg-[#f7f5ef] px-5 sm:px-8"><button onClick={() => setOpen(true)} className="rounded-lg p-2 lg:hidden"><FolderKanban className="h-5 w-5" /></button><div className="ml-auto flex items-center gap-2"><Link href="/" className="text-sm font-medium text-[#5a5448] hover:text-[#242017]">Ver portal</Link><span className="h-5 border-l border-[#242017]/15" /><Link href="/admin/configuracoes" className="rounded-full bg-[#242017] px-3 py-1.5 text-xs font-semibold text-[#f7f5ef]"><Settings className="mr-1 inline h-3.5 w-3.5" />Configurações</Link></div></header><main className="p-5 sm:p-8">{children}</main></div></div>;
}
