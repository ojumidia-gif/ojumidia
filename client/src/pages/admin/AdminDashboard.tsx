import { Activity, AlertTriangle, Archive, ClipboardCheck, FilePenLine, ListFilter, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { siteDestinations } from "@/lib/siteDestinations";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminPage, EmptyAdmin, FirstUserWelcome, statusStyle } from "./_shared";
import { useDaypartGreeting } from "@/hooks/useDaypartGreeting";

const workDoors = [
  { href: "/admin/publicacoes", title: "Escrever", text: "História, cobertura, documentário, projeto e fotografia documental. Texto, território e capa. Depois revisão." },
  { href: "/admin/fotografos", title: "Fotógrafos", text: "Ficha pública em /fotografos. Crédito na foto vale mesmo sem ficha." },
  { href: "/admin/midias", title: "Fotos e vídeos", text: "Envie com crédito e autorização. Marque a capa no conteúdo." },
  { href: "/admin/miniclipes", title: "Miniclipes", text: "Vídeo curto da contratação. Não vai sozinho para a Home." },
  { href: "/admin/territorios", title: "Lugares", text: "Território, endereço, casa, evento. Só o que a casa autorizar." },
  { href: "/admin/comunidade", title: "Casas e memórias", text: "Instituição, agenda e memória oral com consentimento." },
  { href: "/admin/equipes", title: "Créditos", text: "Equipes reutilizáveis no crédito da publicação." },
] as const;

const siteControls = [
  { href: "/admin/destaques", title: "Home e destaques", text: "Quem entra em Histórias recentes." },
  { href: "/admin/conteudo-portal", title: "Textos do portal", text: "Menus, home, páginas. Isto muda o site." },
  { href: "/admin/miniclipes", title: "Fundo vivo", text: "Abertura nacional da Home. Só Super Admin." },
  { href: "/admin/parceiros", title: "Parceiros", text: "Parceiros Ojú, territórios e escopos." },
] as const;

export default function AdminDashboard() {
  const { data: editorialOverview, isLoading } = trpc.editorial.adminSummary.useQuery(undefined, { refetchInterval: 5000 });
  const auth = trpc.auth.me.useQuery();
  const operations = trpc.operations.overview.useQuery({ limit: 6 }, { refetchInterval: 30_000 });
  const context = trpc.partners.myContext.useQuery();
  const partner = context.data?.scope === "partner" ? context.data.partners[0] : null;
  const principal = auth.data?.role === "administrador principal";
  const [partnerHandle, setPartnerHandle] = useState("");
  useEffect(() => { setPartnerHandle(partner?.instagramHandle ? `@${partner.instagramHandle}` : ""); }, [partner?.instagramHandle]);
  const saveHandle = trpc.partners.setMyInstagramHandle.useMutation({
    onSuccess: () => { toast.success("Instagram autorizado salvo. Ele só aparece no portal se a identidade pública estiver ligada."); context.refetch(); },
    onError: error => toast.error(error.message),
  });
  const number = (status: "Rascunho" | "Em revisão" | "Aprovada" | "Publicada" | "Arquivada") => editorialOverview?.counts[status] || 0;
  const uploads = (operations.data?.items || []).filter(item => item.category === "Upload");
  const hello = useDaypartGreeting();
  const kpis = [
    { label: "Rascunhos", value: number("Rascunho"), icon: FilePenLine, tone: "#e2bf54", href: "/admin/publicacoes?etapa=Rascunho" },
    { label: "Em revisão", value: number("Em revisão"), icon: ClipboardCheck, tone: "#7ba8c6", href: "/admin/publicacoes?etapa=Em%20revis%C3%A3o" },
    { label: "Publicados", value: number("Publicada"), icon: Send, tone: "#75aa82", href: "/admin/publicacoes?etapa=Publicada" },
    { label: "Arquivados", value: number("Arquivada"), icon: Archive, tone: "#a9a59b", href: "/admin/publicacoes?etapa=Arquivada" },
  ];

  return (
    <AdminPage
      eyebrow={partner ? "Painel do território" : principal ? "Painel nacional" : "Ojú Mídia"}
      title={partner ? `${hello} ${partner.partnerName}` : hello}
      action={(
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/midias" className="rounded-full border border-[#242017] px-4 py-3 text-sm font-bold">Enviar mídia</Link>
          <Link href="/admin/publicacoes?novo=1" className="rounded-full bg-[#f6b71b] px-5 py-3 text-sm font-bold text-[#242017]">Novo</Link>
        </div>
      )}
    >
      <FirstUserWelcome />
      {partner ? (
        <>
          <p className="-mt-2 mb-4 max-w-3xl text-sm leading-6 text-[#655e52]">
            Você trabalha só {partner.territories.map(item => item.name).join(", ") || "o território autorizado"}. Escrever, fotos, lugares e casas. O Super Admin é quem muda o site, a Home e os textos do portal.
          </p>
          <section className="admin-card mb-6 p-5">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Seu trabalho</p>
            <h2 className="mt-2 font-serif text-2xl">Alimente o território. Não redesenhe o site.</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {workDoors.map(door => (
                <Link key={door.href} href={door.href} className="rounded-2xl bg-[#eee9dc] px-4 py-4">
                  <p className="font-semibold">{door.title}</p>
                  <p className="mt-2 text-xs leading-5 text-[#655e52]">{door.text}</p>
                </Link>
              ))}
            </div>
          </section>
          <section className="admin-card mb-6 p-5">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Permanecer no Ojú</p>
            <h2 className="mt-2 font-serif text-2xl">Seu Instagram, com consentimento.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655e52]">O @ aparece no diretório e no crédito, não na Home. A identidade pública continua a cargo do Super Admin.</p>
            <form className="mt-4 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); saveHandle.mutate({ partnerId: partner.partnerId, handle: partnerHandle || null }); }}>
              <Input value={partnerHandle} onChange={event => setPartnerHandle(event.target.value)} placeholder="@sua.conta" className="max-w-xs" />
              <Button type="submit" disabled={saveHandle.isPending} className="bg-[#242017] text-white">Salvar @</Button>
            </form>
          </section>
        </>
      ) : (
        <>
          <p className="-mt-2 mb-6 max-w-3xl text-sm leading-6 text-[#655e52]">
            {principal
              ? "Só o Super Admin muda o site: Home, textos do portal, fundo vivo e quem é parceiro. A operação editorial fica abaixo."
              : "Você alimenta o que o visitante lê. A Home nacional e os textos do portal não aparecem neste painel."}
          </p>
          {principal ? (
            <section className="mb-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-[#806817]">O site — só Super Admin</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {siteControls.map(item => (
                  <Link key={item.href} href={item.href} className="admin-card p-4">
                    <Sparkles className="h-4 w-4 text-[#806817]" />
                    <p className="mt-3 font-semibold">{item.title}</p>
                    <p className="mt-2 text-xs leading-5 text-[#655e52]">{item.text}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <section className="mb-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-[#806817]">{principal ? "Operação" : "Publicar no site"}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="/admin/guia" className="rounded-full bg-[#242017] px-3 py-2 text-sm font-semibold text-white">Guia criar → publicar</Link>
          <Link href="/admin/canal" className="rounded-full border border-[#242017]/20 px-3 py-2 text-sm font-semibold">{principal ? "Caixa Canal Ojú" : "Canal Ojú"}</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {siteDestinations.map(item => (
            <Link key={item.id} href={item.adminHref} className="rounded-full bg-[#eee9dc] px-3 py-2 text-sm font-semibold">
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(item => (
          <Link key={item.label} href={item.href} className="admin-card p-5">
            <item.icon className="h-5 w-5" style={{ color: item.tone }} />
            <p className="mt-8 text-3xl font-semibold">{isLoading ? "—" : item.value}</p>
            <p className="mt-1 text-sm text-[#655e52]">{item.label}</p>
          </Link>
        ))}
      </div>

      {!partner ? (
        <Link href="/admin/pendencias" className="mt-5 grid gap-4 border border-[#806817]/30 bg-[#fff7e8] p-5 transition hover:bg-[#fff1d7] lg:grid-cols-[auto_1fr_auto]">
          <div className="w-fit rounded-full bg-[#806817] p-3 text-white"><ListFilter className="h-5 w-5" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Central de Pendências</p>
            <h2 className="mt-2 font-serif text-2xl">{operations.isLoading ? "Organizando a operação..." : `${operations.data?.summary.total || 0} decisões e acompanhamentos visíveis`}</h2>
            <p className="mt-1 text-sm text-[#655e52]">{operations.data?.summary.critical ? `${operations.data.summary.critical} pendência(s) crítica(s) precisam de atenção prioritária.` : "Nenhuma pendência crítica no seu escopo neste momento."}</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-[#242017]"><AlertTriangle className="h-4 w-4 text-[#8b3a16]" />Abrir central →</div>
        </Link>
      ) : null}

      {uploads.length ? (
        <section className="admin-card mt-5 p-5">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Uploads</p>
          <h2 className="mt-2 font-serif text-2xl">Envios em andamento ou com falha.</h2>
          <div className="mt-4 grid gap-2">
            {uploads.map(item => (
              <Link key={item.id} href={item.href} className="rounded-xl bg-[#eee9dc] px-4 py-3 text-sm">
                <strong>{item.title}</strong>
                <span className="mt-1 block text-[#655e52]">{item.description}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.5fr_.8fr]">
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#242017]/10 px-6 py-5">
            <div>
              <p className="font-serif text-2xl">Em andamento</p>
              <p className="mt-1 text-sm text-[#655e52]">{partner ? "Só o que está no seu território." : "Conteúdos que pedem atenção da equipe."}</p>
            </div>
            <Link href="/admin/publicacoes" className="text-sm font-semibold">Ver conteúdos</Link>
          </div>
          {editorialOverview?.recent.length ? (
            <div>
              {editorialOverview.recent.map(item => (
                <Link href={`/admin/editar/${item.id}`} key={item.id} className="flex items-center justify-between gap-4 border-b border-[#242017]/5 px-6 py-4 last:border-0 hover:bg-[#f3f0e8]">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-[#655e52]">{item.contentKind} · atualizado {new Date(item.updatedAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6"><EmptyAdmin text="A operação começa quando a equipe cria o primeiro conteúdo. Todo novo material nasce como Rascunho e só chega ao portal após revisão e publicação." href="/admin/publicacoes" label="Criar conteúdo" /></div>
          )}
        </div>
        <div className="admin-card p-6">
          <Activity className="h-5 w-5 text-[#806817]" />
          <p className="mt-7 font-serif text-2xl">O que fazer agora</p>
          <p className="mt-2 text-sm leading-6 text-[#655e52]">{partner ? "Escreva, envie foto, ligue o lugar. Pedir a Home fica no conteúdo já publicado." : "Adicione conteúdo, envie fotos e publique somente depois da revisão."}</p>
          <div className="mt-8 grid gap-2 text-sm font-semibold">
            <Link href="/admin/guia" className="rounded-xl bg-[#eee9dc] px-4 py-3">Abrir o guia</Link>
            <Link href="/admin/publicacoes" className="rounded-xl bg-[#eee9dc] px-4 py-3">Criar ou editar</Link>
            <Link href="/admin/midias" className="rounded-xl bg-[#eee9dc] px-4 py-3">Enviar fotos ou vídeo</Link>
            {partner ? <Link href="/admin/solicitacoes" className="rounded-xl bg-[#eee9dc] px-4 py-3">Pedidos do território</Link> : <Link href="/admin/solicitacoes" className="rounded-xl bg-[#eee9dc] px-4 py-3">Ver solicitações</Link>}
          </div>
        </div>
      </section>
    </AdminPage>
  );
}
