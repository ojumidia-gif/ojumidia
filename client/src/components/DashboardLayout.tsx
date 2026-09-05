import { useAuth } from "@/_core/hooks/useAuth";
import { OjuMark } from "@/components/PublicHeader";
import { startLogin } from "@/const";
import { isPrincipalOnlyAdminPath, visibleAdminNav } from "@/lib/adminNav";
import { isStaticFirebasePreview } from "@/lib/runtimeMode";
import { FolderKanban, Layers3, LogOut, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";

type AuthStatus = { googleOAuth: boolean; localDevLogin: boolean; loginMode: string; message: string };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, error: authError, refresh } = useAuth();
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
  if (loading) return <div className="min-h-screen bg-[#f2efe7]" />;
  if (isStaticFirebasePreview) return <main className="min-h-screen bg-[#242017] px-5 text-[#f7f5ef] grid place-items-center"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-full border border-[#f6b71b]/50 p-4"><Layers3 className="h-7 w-7 text-[#f6b71b]" /></div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f6b71b]">Prévia visual do Firebase</p><h1 className="mt-3 font-serif text-4xl">Centro Administrativo indisponível</h1><p className="mt-4 leading-7 text-[#ded8ca]">Este domínio exibe somente o portal público estático. O Centro Administrativo exige o servidor seguro da Ojú para autenticação, permissões, documentos e dados.</p><Link href="/" className="mt-8 inline-flex items-center rounded-md bg-[#f6b71b] px-4 py-2 text-sm font-medium text-[#242017] hover:bg-[#f3c449]">Voltar ao portal</Link></section></main>;
  if (authError) return <main className="min-h-screen bg-[#242017] px-5 text-[#f7f5ef] grid place-items-center"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-full border border-[#f6b71b]/50 p-4"><Layers3 className="h-7 w-7 text-[#f6b71b]" /></div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f6b71b]">Serviço administrativo indisponível</p><h1 className="mt-3 font-serif text-4xl">Centro Administrativo Ojú</h1><p className="mt-4 leading-7 text-[#ded8ca]">Esta prévia não conseguiu alcançar a API segura que valida sessões, permissões e documentos protegidos.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button onClick={() => refresh()} className="bg-[#f6b71b] text-[#242017] hover:bg-[#f3c449]">Tentar novamente</Button><Link href="/" className="inline-flex items-center rounded-md border border-[#f6b71b]/70 px-4 py-2 text-sm font-medium text-[#f6b71b] hover:bg-[#f6b71b] hover:text-[#242017]">Voltar ao portal</Link></div></section></main>;
  if (!user) {
    const canGoogle = authStatus?.loginMode === "google";
    const canLocal = authStatus?.localDevLogin;
    return <main className="min-h-screen bg-[#242017] px-5 text-[#f7f5ef] grid place-items-center"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-full bg-[#f6b71b] p-4"><Layers3 className="h-7 w-7 text-[#242017]" /></div><h1 className="font-serif text-4xl">Centro Administrativo Ojú</h1><p className="mt-4 leading-7 text-[#ded8ca]">{authStatus?.message || "Entre com sua conta autorizada para administrar a operação editorial da Ojú Mídia."}</p>{canGoogle ? <Button onClick={() => startLogin()} className="mt-8 bg-[#f6b71b] text-[#242017] hover:bg-[#f3c449]">Entrar com Google</Button> : canLocal ? <Button asChild className="mt-8 bg-[#f6b71b] text-[#242017] hover:bg-[#f3c449]"><Link href="/admin/acesso-local">Abrir acesso local</Link></Button> : <p className="mt-8 text-sm leading-6 text-[#aaa190]">Não há login administrativo neste ambiente. No desenvolvimento, habilite o acesso local; em produção, configure o OAuth Google.</p>}</section></main>;
  }
  if (!user.adminAccess) return <main className="min-h-screen bg-[#242017] px-5 text-[#f7f5ef] grid place-items-center"><section className="max-w-md text-center"><div className="mx-auto mb-8 w-fit rounded-full border border-[#f6b71b]/50 p-4"><Layers3 className="h-7 w-7 text-[#f6b71b]" /></div><h1 className="font-serif text-4xl">Acesso não autorizado</h1><p className="mt-4 leading-7 text-[#ded8ca]">Sua sessão está ativa, mas esta conta não foi autorizada individualmente para o Centro Administrativo.</p><Button onClick={logout} variant="outline" className="mt-8 border-[#f6b71b] text-[#f6b71b] hover:bg-[#f6b71b] hover:text-[#242017]">Sair desta conta</Button></section></main>;
  if (user.role !== "administrador principal" && isPrincipalOnlyAdminPath(location)) {
    return (
      <main className="min-h-screen bg-[#242017] px-5 text-[#f7f5ef] grid place-items-center">
        <section className="max-w-md text-center">
          <div className="mx-auto mb-8 w-fit rounded-full border border-[#f6b71b]/50 p-4"><Layers3 className="h-7 w-7 text-[#f6b71b]" /></div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f6b71b]">Área restrita</p>
          <h1 className="mt-3 font-serif text-4xl">Você não tem permissão para esta área</h1>
          <p className="mt-4 leading-7 text-[#ded8ca]">Esta rota é exclusiva do Super Admin. O menu não oferece este atalho, e a API continua recusando a operação.</p>
          <Link href="/admin" className="mt-8 inline-flex items-center rounded-md bg-[#f6b71b] px-4 py-2 text-sm font-medium text-[#242017] hover:bg-[#f3c449]">Voltar ao painel</Link>
        </section>
      </main>
    );
  }
  const groups = visibleAdminNav(user.role);
  const partnerLabel = context.data?.scope === "partner" ? context.data.partners[0] : null;
  const Sidebar = () => (
    <aside className="flex h-full w-[272px] flex-col bg-[#242017] p-5 text-[#eae4d7]">
      <div className="mb-6"><OjuMark compact /></div>
      {partnerLabel ? <p className="mb-4 rounded-xl bg-white/5 px-3 py-2 text-xs leading-5 text-[#d9d1c3]">{partnerLabel.partnerName}<br /><span className="text-[#aaa190]">Parceiro Ojú · {partnerLabel.territories.map(item => item.name).join(", ") || "território autorizado"}</span></p> : <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#aaa190]">Operação {user.role === "administrador principal" ? "nacional" : "editorial"}</p>}
      <nav className="space-y-4 overflow-y-auto pr-1">
        {groups.map(group => (
          <div key={group.id}>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d8678]">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${location === href ? "bg-[#f6b71b] font-semibold text-[#242017]" : "text-[#d9d1c3] hover:bg-white/10"}`}>
                  <Icon className="h-4 w-4" />{label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-4">
        <p className="px-2 text-sm font-medium">{user.name || "Equipe Ojú"}</p>
        <p className="px-2 pt-1 text-xs capitalize text-[#aaa190]">{user.role === "administrador principal" ? "Super Admin" : user.role}</p>
        <button onClick={logout} className="mt-4 flex items-center gap-3 px-2 text-sm text-[#d9d1c3] hover:text-white"><LogOut className="h-4 w-4" />Sair</button>
      </div>
    </aside>
  );
  return <div className="min-h-screen bg-[#f2efe7] text-[#242017]"><div className="fixed inset-y-0 left-0 z-30 hidden lg:block"><Sidebar /></div>{open && <div className="fixed inset-0 z-50 bg-black/45 lg:hidden"><div className="h-full"><Sidebar /></div><button onClick={() => setOpen(false)} className="absolute right-5 top-5 rounded-full bg-white p-2"><X className="h-5 w-5" /></button></div>}<div className="min-h-screen lg:pl-[272px]"><header className="flex h-[68px] items-center justify-between border-b border-[#242017]/10 bg-[#f7f5ef] px-5 sm:px-8"><button onClick={() => setOpen(true)} className="rounded-lg p-2 lg:hidden"><FolderKanban className="h-5 w-5" /></button><div className="ml-auto flex items-center gap-2"><Link href="/" className="text-sm font-medium text-[#5a5448] hover:text-[#242017]">Ver portal</Link><span className="h-5 border-l border-[#242017]/15" /><Link href="/admin/configuracoes" className="rounded-full bg-[#242017] px-3 py-1.5 text-xs font-semibold text-[#f7f5ef]"><Settings className="mr-1 inline h-3.5 w-3.5" />Configurações</Link></div></header><main className="p-5 sm:p-8">{children}</main></div></div>;
}
