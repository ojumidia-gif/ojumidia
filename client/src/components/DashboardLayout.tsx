import { useAuth } from "@/_core/hooks/useAuth";
import { OjuMark } from "@/components/PublicHeader";
import { startLogin } from "@/const";
import { isPartnerHiddenAdminPath, isPrincipalOnlyAdminPath, visibleAdminNav } from "@/lib/adminNav";
import { isStaticFirebasePreview } from "@/lib/runtimeMode";
import { useDaypartGreeting } from "@/hooks/useDaypartGreeting";
import { FolderKanban, Layers3, LogOut, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { OjuBot } from "./OjuBot";

type AuthStatus = { googleOAuth: boolean; localDevLogin: boolean; loginMode: string; message: string };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, error: authError, refresh } = useAuth();
  const greeting = useDaypartGreeting();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const context = trpc.partners.myContext.useQuery(undefined, { enabled: Boolean(user) });
  useEffect(() => {
    fetch("/api/auth/status", { cache: "no-store" })
      .then(async response => (response.ok ? (response.json() as Promise<AuthStatus>) : null))
      .then(data => setAuthStatus(data))
      .catch(() => setAuthStatus(null));
  }, []);
  useEffect(() => {
    if (!loading && !user && authStatus?.localDevLogin && location !== "/admin/acesso-local") setLocation("/admin/acesso-local");
  }, [loading, authStatus, location, setLocation, user]);
  if (loading) return <div className="min-h-screen bg-oju-paz" />;
  if (isStaticFirebasePreview) return <main className="grid min-h-screen place-items-center bg-oju-verde-profundo px-5 text-oju-paz"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-sm border border-oju-dourado/50 p-4"><Layers3 className="h-7 w-7 text-oju-dourado" /></div><p className="editorial-kicker text-oju-dourado-claro">Prévia visual do Firebase</p><h1 className="mt-3 font-serif text-4xl">Centro Administrativo indisponível</h1><p className="mt-4 leading-7 text-oju-papel">Este domínio exibe somente o portal público estático. O Centro Administrativo exige o servidor seguro da Ojú para autenticação, permissões, documentos e dados.</p><Link href="/" className="mt-8 inline-flex items-center rounded-sm bg-oju-paz px-4 py-2 text-sm font-medium text-oju-verde-profundo">Voltar ao portal</Link></section></main>;
  if (authError) return <main className="grid min-h-screen place-items-center bg-oju-verde-profundo px-5 text-oju-paz"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-sm border border-oju-dourado/50 p-4"><Layers3 className="h-7 w-7 text-oju-dourado" /></div><p className="editorial-kicker text-oju-dourado-claro">Serviço administrativo indisponível</p><h1 className="mt-3 font-serif text-4xl">Centro Administrativo Ojú</h1><p className="mt-4 leading-7 text-oju-papel">Esta prévia não conseguiu alcançar a API segura que valida sessões, permissões e documentos protegidos.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button onClick={() => refresh()}>Tentar novamente</Button><Link href="/" className="inline-flex items-center rounded-sm border border-oju-dourado/70 px-4 py-2 text-sm font-medium text-oju-dourado-claro">Voltar ao portal</Link></div></section></main>;
  if (!user) {
    const canGoogle = authStatus?.loginMode === "google";
    const canLocal = authStatus?.localDevLogin;
    const oauthError = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("erro") === "oauth";
    return <main className="grid min-h-screen place-items-center bg-oju-verde-profundo px-5 text-oju-paz"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-sm bg-oju-dourado p-4"><Layers3 className="h-7 w-7 text-oju-verde-profundo" /></div><h1 className="font-serif text-4xl">Centro Administrativo Ojú</h1><p className="mt-4 leading-7 text-oju-papel">{authStatus?.message || "Entre com sua conta autorizada para administrar a operação editorial da Ojú Mídia."}</p>{oauthError ? <p className="mt-4 text-sm leading-6 text-oju-dourado-claro">O retorno do Google precisa ser exatamente o mesmo endereço cadastrado no Client ID. Use o mesmo domínio para entrar de novo.</p> : null}{canGoogle ? <Button onClick={() => startLogin()} className="mt-8">Entrar com Google</Button> : canLocal ? <Button asChild className="mt-8"><Link href="/admin/acesso-local">Abrir acesso local</Link></Button> : <p className="mt-8 text-sm leading-6 text-oju-dourado-claro">Não há login administrativo neste ambiente. No desenvolvimento, habilite o acesso local; em produção, configure o OAuth Google.</p>}</section></main>;
  }
  if (!user.adminAccess) return <main className="grid min-h-screen place-items-center bg-oju-verde-profundo px-5 text-oju-paz"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-sm border border-oju-dourado/50 p-4"><Layers3 className="h-7 w-7 text-oju-dourado" /></div><h1 className="font-serif text-4xl">Acesso não autorizado</h1><p className="mt-4 leading-7 text-oju-papel">Sua sessão está ativa, mas esta conta não foi autorizada individualmente para o Centro Administrativo.</p><Button onClick={logout} variant="outline" className="mt-8 border-oju-dourado text-oju-dourado-claro">Sair desta conta</Button></section></main>;
  const partnerLabel = context.data?.scope === "partner" ? context.data.partners[0] : null;
  const principal = user.role === "administrador principal";
  if ((!principal && isPrincipalOnlyAdminPath(location)) || (partnerLabel && isPartnerHiddenAdminPath(location))) {
    return (
      <main className="grid min-h-screen place-items-center bg-oju-verde-profundo px-5 text-oju-paz">
        <section className="max-w-md text-center">
          <div className="mx-auto mb-8 w-fit rounded-sm border border-oju-dourado/50 p-4"><Layers3 className="h-7 w-7 text-oju-dourado" /></div>
          <p className="editorial-kicker text-oju-dourado-claro">Área restrita</p>
          <h1 className="mt-3 font-serif text-4xl">Você não tem permissão para esta área</h1>
          <p className="mt-4 leading-7 text-oju-papel">{partnerLabel ? "Esta tela muda o site inteiro. No painel do parceiro você só trabalha o território: escrever, fotos, casas e pedidos." : "Esta área fica com a Equipe Ojú. O menu não oferece este atalho."}</p>
          <Link href="/admin" className="mt-8 inline-flex items-center rounded-sm bg-oju-paz px-4 py-2 text-sm font-medium text-oju-verde-profundo">Voltar ao painel</Link>
        </section>
      </main>
    );
  }
  const groups = visibleAdminNav(user.role, Boolean(partnerLabel));
  const Sidebar = () => (
    <aside className="flex h-full w-[272px] flex-col bg-oju-verde-profundo p-5 text-oju-paz">
      <div className="mb-6"><OjuMark compact cinematic /></div>
      {partnerLabel ? <p className="mb-4 rounded-sm bg-white/5 px-3 py-2 text-xs leading-5 text-oju-papel">{partnerLabel.partnerName}<br /><span className="text-oju-dourado-claro">Parceiro Ojú · {partnerLabel.territories.map(item => item.name).join(", ") || "cidade autorizada"}</span></p> : <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-oju-dourado-claro">Operação {user.role === "administrador principal" ? "nacional" : "editorial"}</p>}
      <nav className="space-y-4 overflow-y-auto pr-1">
        {groups.map(group => (
          <div key={group.id}>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-oju-dourado-claro/80">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition ${location === href ? "border-l-2 border-oju-dourado bg-oju-verde font-semibold text-oju-branco" : "text-oju-papel hover:bg-white/10"}`}>
                  <Icon className="h-4 w-4" />{label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-4">
        <p className="px-2 text-sm font-medium">{greeting} {user.name || "Equipe Ojú"}</p>
        <p className="px-2 pt-1 text-xs text-oju-dourado-claro">{principal ? "Equipe Ojú · o site" : partnerLabel ? "Criador parceiro" : user.role}</p>
        <button onClick={logout} className="mt-4 flex items-center gap-3 px-2 text-sm text-oju-papel hover:text-white"><LogOut className="h-4 w-4" />Sair</button>
      </div>
    </aside>
  );
  return (
    <div className="min-h-screen bg-oju-paz text-oju-terra">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block"><Sidebar /></div>
      {open && <div className="fixed inset-0 z-50 bg-black/45 lg:hidden"><div className="h-full"><Sidebar /></div><button onClick={() => setOpen(false)} className="absolute right-5 top-5 rounded-sm bg-oju-paz p-2"><X className="h-5 w-5" /></button></div>}
      <div className="min-h-screen lg:pl-[272px]">
        <header className="flex h-[68px] items-center justify-between gap-4 border-b border-oju-terra/10 bg-oju-paz-claro px-5 sm:px-8">
          <button onClick={() => setOpen(true)} className="rounded-sm p-2 lg:hidden"><FolderKanban className="h-5 w-5" /></button>
          <p className="hidden min-w-0 flex-1 text-xs leading-5 text-oju-terra-suave lg:block">
            {greeting}{" "}
            {principal
              ? "Equipe Ojú · o site, a Home e os textos do portal. Parceiros trabalham a cidade."
              : partnerLabel
                ? `Criador parceiro · ${partnerLabel.territories.map(item => item.name).join(", ") || "escopo autorizado"}. Sem CMS, sem Home nacional.`
                : "Operação editorial · rascunho, revisão, aprovação e só então o portal."}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/admin/guia" className="text-sm font-medium text-oju-terra-suave hover:text-oju-terra">Guia</Link>
            <Link href="/" className="text-sm font-medium text-oju-terra-suave hover:text-oju-terra">Ver portal</Link>
            {principal ? (
              <>
                <span className="h-5 border-l border-oju-terra/15" />
                <Link href="/admin/configuracoes" className="rounded-sm bg-oju-verde px-3 py-1.5 text-xs font-semibold text-oju-branco"><Settings className="mr-1 inline h-3.5 w-3.5" />O site</Link>
              </>
            ) : null}
          </div>
        </header>
        <main className="p-5 sm:p-8">{children}</main>
        <OjuBot />
      </div>
    </div>
  );
}
