import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { nextEditorialAction, publicationSiteGaps } from "@/lib/editorialFlow";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { CoverageMediaPanel } from "./CoverageMediaPanel";
import { CoverageTaxonomiesPanel } from "./CoverageTaxonomiesPanel";
import { InstitutionalCoveragePanel } from "./InstitutionalCoveragePanel";
import { SiteReadiness, AdminFlowGuide } from "./_shared";
import { siteDestinationByKind } from "@/lib/siteDestinations";
import { EditorialBody } from "@/components/EditorialBody";

const destinations: Record<string, string> = {
  "História": "Portal → Histórias",
  "Cobertura": "Portal → Coberturas",
  "Documentário": "Portal → Documentários",
  "Projeto": "Portal → Projetos",
  "Fotografia documental": "Portal → Fotografia documental",
};

export default function PublicationEdit() {
  const { user } = useAuth();
  const [, params] = useRoute("/admin/editar/:id"); const id = Number(params?.id);
  const utils = trpc.useUtils(); const { data, isLoading } = trpc.editorial.preview.useQuery({ id }, { enabled: Boolean(id) });
  const [title, setTitle] = useState(""); const [subtitle, setSubtitle] = useState(""); const [summary, setSummary] = useState(""); const [body, setBody] = useState(""); const [teamCredit, setTeamCredit] = useState(""); const [revisionNote, setRevisionNote] = useState(""); const [externalAlbumUrl, setExternalAlbumUrl] = useState(""); const [externalVideoUrl, setExternalVideoUrl] = useState("");
  useEffect(() => { if (data) { setTitle(data.title); setSubtitle(data.subtitle || ""); setSummary(data.summary || ""); setBody(data.body || ""); setTeamCredit(data.teamCredit || "Equipe Ojú"); setExternalAlbumUrl(data.externalAlbumUrl || ""); setExternalVideoUrl(data.externalVideoUrl || ""); } }, [data]);
  const [conflict, setConflict] = useState(false);
  const update = trpc.editorial.update.useMutation({
    onSuccess: () => { const published = data?.status === "Publicada"; toast.success(published ? "Revisão publicada." : "Texto salvo."); utils.editorial.adminList.invalidate(); utils.editorial.preview.invalidate({ id }); },
    onError: error => { const concurrent = error.data?.code === "CONFLICT"; setConflict(concurrent); toast.error(concurrent ? "Outra pessoa atualizou este conteúdo." : "Não foi possível salvar as alterações.", { description: concurrent ? "Recarregue para revisar a versão mais recente antes de salvar novamente." : error.message }); },
  });
  const advance = trpc.editorial.advanceStatus.useMutation({
    onSuccess: result => {
      const messages: Record<string, string> = {
        "Em revisão": "Enviado para revisão. Ainda não está no site.",
        Aprovada: "Aprovado. Agora um administrador pode publicar no site.",
        Publicada: "Publicado no portal. A Home / Histórias recentes só aparece se a curadoria nacional marcar.",
      };
      toast.success(messages[result.status] || "Etapa editorial atualizada.");
      utils.editorial.adminList.invalidate();
      utils.editorial.preview.invalidate({ id });
    },
    onError: error => toast.error(error.message),
  });
  const schedule = trpc.editorial.schedulePublish.useMutation({ onSuccess: () => { toast.success("Publicação programada."); utils.editorial.preview.invalidate({ id }); utils.editorial.adminList.invalidate(); }, onError: error => toast.error(error.message) });
  const [scheduledAt, setScheduledAt] = useState("");
  const [homeOn, setHomeOn] = useState(false);
  const [homePlacement, setHomePlacement] = useState<"Nenhum" | "Destaque principal" | "Destaque secundário" | "Recomendado">("Recomendado");
  useEffect(() => {
    if (!data) return;
    const curated = data.homePlacement !== "Nenhum" || data.manualFeatured;
    setHomeOn(curated);
    setHomePlacement(data.homePlacement === "Nenhum" ? "Recomendado" : data.homePlacement);
  }, [data]);
  const setFeatured = trpc.editorial.setFeatured.useMutation({
    onSuccess: () => { toast.success(homeOn ? "Capa marcada para Histórias recentes na Home." : "Retirado da Home."); utils.editorial.preview.invalidate({ id }); utils.editorial.featured.invalidate(); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const suggestHighlight = trpc.editorial.suggestHighlight.useMutation({
    onSuccess: () => toast.success("Pedido enviado. A Home ainda não mudou."),
    onError: error => toast.error(error.message),
  });
  const publishDirect = trpc.editorial.publishDirect.useMutation({
    onSuccess: () => { toast.success("No portal."); utils.editorial.adminList.invalidate(); utils.editorial.preview.invalidate({ id }); },
    onError: error => toast.error(error.message),
  });
  if (isLoading) return <DashboardLayout><p>Carregando publicação...</p></DashboardLayout>;
  if (!data) return <DashboardLayout><p>Publicação não encontrada.</p></DashboardLayout>;
  const isPublished = data.status === "Publicada";
  const cover = data.media.find(item => item.isCover) || data.media[0];
  const nextAction = nextEditorialAction(user?.role, data.status);
  const gaps = publicationSiteGaps({ ...data, teamCredit: teamCredit || data.teamCredit, body: body || data.body, summary: summary || data.summary });
  const canDirect = user?.role === "administrador" || user?.role === "administrador principal";
  const payload = { id, expectedVersion: data.version, title, subtitle: subtitle || null, summary: summary || null, body: body || null, teamCredit: teamCredit || "Equipe Ojú", externalAlbumUrl: externalAlbumUrl || null, externalVideoUrl: externalVideoUrl || null, revisionNote: revisionNote || undefined };
  const busy = update.isPending || advance.isPending || publishDirect.isPending;
  const saveThenAdvance = () => {
    update.mutate(payload, {
      onSuccess: result => advance.mutate({ id, expectedVersion: result.version }),
    });
  };
  const goLive = () => {
    update.mutate(payload, {
      onSuccess: result => publishDirect.mutate({ id, expectedVersion: result.version }),
    });
  };
  return <DashboardLayout><div className="mx-auto max-w-4xl pb-28">
    <Link href="/admin/publicacoes" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Conteúdos</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">{data.contentKind} · {destinations[data.contentKind] || "Portal"}</p>
        <h1 className="mt-1 font-serif text-4xl sm:text-5xl">{isPublished ? title : "Completar e publicar"}</h1>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isPublished ? "bg-[#d8eadc] text-[#2c683b]" : "bg-[#eee4c8] text-[#695411]"}`}>{data.status}</span>
    </div>
    <nav className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
      <a href="#texto" className="rounded-full bg-[#eee9dc] px-3 py-1.5">Texto</a>
      <a href="#territorio" className="rounded-full bg-[#eee9dc] px-3 py-1.5">Território</a>
      <a href="#midia" className="rounded-full bg-[#eee9dc] px-3 py-1.5">Capa</a>
      {isPublished ? <a href="#home" className="rounded-full bg-[#eee9dc] px-3 py-1.5">Home</a> : null}
    </nav>
    {data.status !== "Publicada" ? <div className="mt-4"><SiteReadiness items={gaps} readyText="Pronto. Publique no site." /></div> : null}
    <div className="mt-4"><AdminFlowGuide destinationId={siteDestinationByKind(data.contentKind)?.id || "historias"} /></div>
    {conflict && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b95140]/30 bg-[#fff1ec] p-4 text-sm text-[#7a3126]"><span>Outra pessoa salvou primeiro.</span><Button size="sm" type="button" onClick={() => { setConflict(false); utils.editorial.preview.invalidate({ id }); }}>Recarregar</Button></div>}
    {isPublished && <p className="mt-4 text-sm text-[#655e52]">No portal. Home só com Super Admin.</p>}
    <form id="texto" onSubmit={event => { event.preventDefault(); update.mutate(payload); }} className="admin-card mt-8 grid gap-5 p-6">
      <label className="grid gap-2 text-sm font-medium">Título<Input required value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Subtítulo<Input value={subtitle} onChange={event => setSubtitle(event.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">Crédito ou equipe responsável<Input value={teamCredit} onChange={event => setTeamCredit(event.target.value)} placeholder="Ex.: Equipe Ojú · Fotografia: Nome" /></label>
      <label className="grid gap-2 text-sm font-medium">Resumo<Textarea value={summary} onChange={event => setSummary(event.target.value)} /></label>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Texto editorial</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setBody(current => `${current.trim() ? `${current.trim()}\n\n` : ""}## Trecho\n`)}>Trecho</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setBody(current => `${current.trim() ? `${current.trim()}\n\n` : ""}> Destaque autorizado.\n`)}>Destaque</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setBody(current => `${current}**destaque**`)}>Negrito</Button>
          </div>
        </div>
        <p className="text-xs leading-5 text-[#655e52]">Parágrafo em branco separa trechos. ## para subtítulo. &gt; para destaque. **palavra** para ênfase. Nada de nomes, pontos ou cantos como enfeite.</p>
        <Textarea className="min-h-64" value={body} onChange={event => setBody(event.target.value)} />
        {(body || summary) ? <div className="rounded-xl bg-[#120f0c] p-5"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[#c9a27a]">Como o portal lê</p><EditorialBody text={body || summary} /></div> : null}
      </div>
      <section className="rounded-xl border border-[#242017]/10 bg-[#f7f3e9] p-4"><p className="text-sm font-semibold">Links externos opcionais</p><p className="mt-1 text-xs leading-5 text-[#655e52]">O portal mantém até 5 fotos e 2 vídeos curtos. Capa atual: {cover ? cover.filename || `#${cover.id}` : "ainda sem capa — marque abaixo."}</p><div className="mt-3 grid gap-3 md:grid-cols-2"><Input type="url" value={externalAlbumUrl} onChange={event => setExternalAlbumUrl(event.target.value)} placeholder="Álbum completo"/><Input type="url" value={externalVideoUrl} onChange={event => setExternalVideoUrl(event.target.value)} placeholder="Vídeo completo"/></div></section>
      {isPublished && <label className="grid gap-2 text-sm font-medium">Motivo da revisão<Textarea value={revisionNote} onChange={event => setRevisionNote(event.target.value)} /></label>}
      <div className="flex flex-wrap justify-end gap-3">
        {!isPublished && <Button type="button" variant="outline" asChild><Link href={`/admin/preview/${id}`}>Prévia como no site</Link></Button>}
        {data.status === "Aprovada" && <div className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-xs font-semibold">Programar<input type="datetime-local" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} className="h-10 rounded-md border px-2 text-sm" /></label><Button type="button" variant="outline" disabled={schedule.isPending || !scheduledAt} onClick={() => schedule.mutate({ id, expectedVersion: data.version, scheduledAt: new Date(scheduledAt) })}>Agendar</Button></div>}
        <Button disabled={update.isPending} className="bg-[#242017] text-white">{update.isPending ? "Salvando..." : isPublished ? "Publicar revisão" : "Salvar texto"}</Button>
      </div>
    </form>
    <section id="territorio" className="mt-10">
      <h2 className="font-serif text-3xl">Território</h2>
      <p className="mt-1 text-sm text-[#655e52]">Obrigatório. Sem território não publica.</p>
      <CoverageTaxonomiesPanel publicationId={id} version={data.version} initialIds={data.taxonomies.map(item => item.id)} contentKind={data.contentKind} />
      {data.contentKind === "Cobertura" && <InstitutionalCoveragePanel publication={data} />}
    </section>
    <section id="midia" className="mt-10">
      <h2 className="font-serif text-3xl">Capa</h2>
      <p className="mt-1 text-sm text-[#655e52]">{data.contentKind === "Fotografia documental" ? "Até 5 fotos com data, local e biografia. Marque a capa." : "Até 5 fotos e 2 vídeos. Marque a capa."}</p>
      <CoverageMediaPanel publicationId={id} coverageTitle={data.title} contentKind={data.contentKind} documentaryPhotos={data.contentKind === "Fotografia documental"} existingMedia={data.media.map(media => ({ id: media.id, mediaType: media.mediaType, filename: media.filename, isCover: media.isCover }))} eventNames={data.taxonomies.filter(taxonomy => taxonomy.dimension === "Evento").map(taxonomy => taxonomy.name)} />
    </section>
    {isPublished ? <section id="home" className="admin-card mt-10 p-6">
      <h2 className="font-serif text-3xl">4. Home e Histórias recentes</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655e52]">Publicar não coloca a foto de capa na Home. Só entra em destaque quando a curadoria nacional marca. A capa é a foto com ordem 0, autorizada e ativa.</p>
      {cover ? <p className="mt-3 text-xs text-[#655e52]">Capa atual: {cover.filename || `#${cover.id}`}</p> : <p className="mt-3 text-xs text-[#8b4d24]">Sem capa marcada — a Home ficaria sem foto.</p>}
      {user?.role === "administrador principal" ? (
        <div className="mt-5 grid gap-4">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={homeOn} onChange={event => setHomeOn(event.target.checked)} />
            <span><strong>Mostrar em Histórias recentes</strong><span className="mt-1 block text-xs text-[#655e52]">A capa deste conteúdo aparece na Home nacional.</span></span>
          </label>
          {homeOn ? <label className="grid max-w-xs gap-1 text-xs font-semibold">Posição na Home
            <select value={homePlacement} onChange={event => setHomePlacement(event.target.value as typeof homePlacement)} className="h-10 rounded-md border bg-white px-2 text-sm font-normal">
              <option>Destaque principal</option>
              <option>Destaque secundário</option>
              <option>Recomendado</option>
            </select>
          </label> : null}
          <div><Button type="button" disabled={setFeatured.isPending} className="bg-[#242017] text-white" onClick={() => setFeatured.mutate({ id, manualFeatured: homeOn, relevance: Math.max(data.relevance, homeOn ? 60 : 0), homePlacement: homeOn ? homePlacement : "Nenhum", homeOrder: data.homeOrder })}>{setFeatured.isPending ? "Salvando..." : "Salvar na Home"}</Button></div>
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-sm text-[#655e52]">Só o Super Admin coloca na Home.</p>
          <Button type="button" variant="outline" className="mt-3" disabled={suggestHighlight.isPending || data.homePlacement !== "Nenhum" || data.manualFeatured} onClick={() => suggestHighlight.mutate({ publicationId: id, note: "Pedido para aparecer em Histórias recentes com a foto de capa." })}>{data.homePlacement !== "Nenhum" || data.manualFeatured ? "Já está na Home" : "Pedir Histórias recentes"}</Button>
        </div>
      )}
    </section> : null}
    {!isPublished ? (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#242017]/15 bg-[#f7f3e9]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#655e52]">{gaps.length ? gaps[0] : "Pronto para o site."}{gaps.length > 1 ? ` · +${gaps.length - 1}` : ""}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => update.mutate(payload)}>Salvar</Button>
            {canDirect ? (
              <Button type="button" disabled={busy || gaps.length > 0} className="bg-[#242017] text-white" onClick={goLive}>{busy ? "Publicando..." : "Publicar no site"}</Button>
            ) : nextAction ? (
              <Button type="button" disabled={busy || (data.status === "Rascunho" && gaps.length > 0)} className="bg-[#242017] text-white" onClick={() => data.status === "Rascunho" ? saveThenAdvance() : advance.mutate({ id, expectedVersion: data.version })}>
                {data.status === "Rascunho" ? "Salvar e enviar para revisão" : nextAction.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    ) : null}
  </div></DashboardLayout>;
}
