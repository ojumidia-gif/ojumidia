import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { canPublishStraight, nextEditorialAction, publicationSiteGaps, publishWizardLabels, publishWizardStep } from "@/lib/editorialFlow";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { CoverageMediaPanel } from "./CoverageMediaPanel";
import { CoverageTaxonomiesPanel } from "./CoverageTaxonomiesPanel";
import { InstitutionalCoveragePanel } from "./InstitutionalCoveragePanel";
import { SiteReadiness } from "./_shared";
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
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  useEffect(() => { if (data) { setTitle(data.title); setSubtitle(data.subtitle || ""); setSummary(data.summary || ""); setBody(data.body || ""); setTeamCredit(data.teamCredit || "Equipe Ojú"); setExternalAlbumUrl(data.externalAlbumUrl || ""); setExternalVideoUrl(data.externalVideoUrl || ""); } }, [data]);
  const [conflict, setConflict] = useState(false);
  const update = trpc.editorial.update.useMutation({
    onSuccess: () => { const published = data?.status === "Publicada"; toast.success(published ? "Revisão publicada." : "Texto salvo."); utils.editorial.adminList.invalidate(); utils.editorial.preview.invalidate({ id }); },
    onError: error => { const concurrent = error.data?.code === "CONFLICT"; setConflict(concurrent); toast.error(concurrent ? "Outra pessoa atualizou este conteúdo." : "Não foi possível salvar as alterações.", { description: concurrent ? "Recarregue para revisar a versão mais recente antes de salvar novamente." : error.message }); },
  });
  const advance = trpc.editorial.advanceStatus.useMutation({
    onSuccess: result => {
      const messages: Record<string, string> = {
        "Em revisão": "Pedido de revisão enviado. Ainda não está no site.",
        Aprovada: "Aprovado. Agora um administrador pode publicar no site.",
        Publicada: "Publicado no portal. A Home só aparece se a curadoria nacional marcar.",
      };
      toast.success(messages[result.status] || "Etapa editorial atualizada.");
      utils.editorial.adminList.invalidate();
      utils.editorial.preview.invalidate({ id });
    },
    onError: error => toast.error(error.message),
  });
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
  const gaps = publicationSiteGaps({ ...data, body: body || data?.body, summary: summary || data?.summary, media: data?.media || [], taxonomies: data?.taxonomies || [] });
  useEffect(() => {
    if (!data || data.status === "Publicada") return;
    setWizardStep(publishWizardStep(publicationSiteGaps(data)));
  }, [data?.id]);
  if (isLoading) return <DashboardLayout><p>Carregando publicação...</p></DashboardLayout>;
  if (!data) return <DashboardLayout><p>Publicação não encontrada.</p></DashboardLayout>;
  const isPublished = data.status === "Publicada";
  const cover = data.media.find(item => item.isCover) || data.media[0];
  const nextAction = nextEditorialAction(user?.role, data.status);
  const canDirect = canPublishStraight(user?.role);
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
  const stepBlocked = (step: 1 | 2 | 3) => {
    if (step === 1) return !(body || summary || data.body || data.summary)?.trim() || title.trim().length < 4;
    if (step === 2) return !data.taxonomies.some(item => item.dimension === "Território");
    return gaps.length > 0;
  };
  const goNext = () => {
    if (stepBlocked(wizardStep)) {
      toast.error(wizardStep === 1 ? "Escreva o título e o texto." : wizardStep === 2 ? "Ligue um território." : "Falta a capa.");
      return;
    }
    update.mutate(payload, { onSuccess: () => setWizardStep(current => (current === 3 ? 3 : current + 1) as 1 | 2 | 3) });
  };

  return <DashboardLayout><div className={`mx-auto max-w-4xl ${isPublished ? "pb-10" : "pb-28"}`}>
    <Link href="/admin/publicacoes" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Conteúdos</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">{data.contentKind} · {destinations[data.contentKind] || "Portal"}</p>
        <h1 className="mt-1 font-serif text-4xl sm:text-5xl">{isPublished ? title : "Três passos até o site"}</h1>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isPublished ? "bg-[#d8eadc] text-[#2c683b]" : "bg-[#eee4c8] text-[#695411]"}`}>{isPublished ? "No site" : "Rascunho"}</span>
    </div>

    {!isPublished ? (
      <nav className="mt-6 grid gap-2 sm:grid-cols-3">
        {publishWizardLabels.map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3;
          const active = wizardStep === step;
          return (
            <button key={label} type="button" onClick={() => setWizardStep(step)} className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${active ? "bg-[#242017] text-white" : "bg-[#eee9dc] text-[#242017]"}`}>
              {step}. {label}
            </button>
          );
        })}
      </nav>
    ) : (
      <nav className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
        <a href="#texto" className="rounded-full bg-[#eee9dc] px-3 py-1.5">Texto</a>
        <a href="#territorio" className="rounded-full bg-[#eee9dc] px-3 py-1.5">Território</a>
        <a href="#midia" className="rounded-full bg-[#eee9dc] px-3 py-1.5">Capa</a>
        <a href="#home" className="rounded-full bg-[#eee9dc] px-3 py-1.5">Home</a>
      </nav>
    )}

    {data.status !== "Publicada" ? <div className="mt-4"><SiteReadiness items={gaps} readyText="Pronto. Publique no site." /></div> : null}
    {conflict && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b95140]/30 bg-[#fff1ec] p-4 text-sm text-[#7a3126]"><span>Outra pessoa salvou primeiro.</span><Button size="sm" type="button" onClick={() => { setConflict(false); utils.editorial.preview.invalidate({ id }); }}>Recarregar</Button></div>}
    {isPublished && <p className="mt-4 text-sm text-[#655e52]">No portal. Home só com Super Admin. Aqui você aprimora o texto, crédito e links.</p>}

    {(isPublished || wizardStep === 1) ? (
    <form id="texto" onSubmit={event => { event.preventDefault(); update.mutate(payload); }} className="admin-card mt-8 grid gap-5 p-6">
      <label className="grid gap-2 text-sm font-medium">Título<Input required value={title} onChange={event => setTitle(event.target.value)} /></label>
      {isPublished ? (
        <>
          <label className="grid gap-2 text-sm font-medium">Subtítulo<Input value={subtitle} onChange={event => setSubtitle(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Crédito ou equipe responsável<Input value={teamCredit} onChange={event => setTeamCredit(event.target.value)} placeholder="Ex.: Equipe Ojú · Fotografia: Nome" /></label>
          <label className="grid gap-2 text-sm font-medium">Resumo<Textarea value={summary} onChange={event => setSummary(event.target.value)} /></label>
        </>
      ) : null}
      <div className="grid gap-2">
        <p className="text-sm font-medium">{isPublished ? "Texto editorial" : "Texto que o site vai ler"}</p>
        {isPublished ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setBody(current => `${current.trim() ? `${current.trim()}\n\n` : ""}## Trecho\n`)}>Trecho</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setBody(current => `${current.trim() ? `${current.trim()}\n\n` : ""}> Destaque autorizado.\n`)}>Destaque</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setBody(current => `${current}**destaque**`)}>Negrito</Button>
          </div>
        ) : <p className="text-xs text-[#655e52]">Um ou dois parágrafos bastam para publicar. Depois você amplia.</p>}
        <Textarea className="min-h-64" value={body} onChange={event => setBody(event.target.value)} />
        {(body || summary) ? <div className="rounded-xl bg-[#120f0c] p-5"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[#c9a27a]">Como o portal lê</p><EditorialBody text={body || summary} /></div> : null}
      </div>
      {isPublished ? (
        <>
          <section className="rounded-xl border border-[#242017]/10 bg-[#f7f3e9] p-4"><p className="text-sm font-semibold">Links externos opcionais</p><p className="mt-1 text-xs leading-5 text-[#655e52]">O portal mantém até 5 fotos e 2 vídeos curtos. Capa atual: {cover ? cover.filename || `#${cover.id}` : "ainda sem capa — marque abaixo."}</p><div className="mt-3 grid gap-3 md:grid-cols-2"><Input type="url" value={externalAlbumUrl} onChange={event => setExternalAlbumUrl(event.target.value)} placeholder="Álbum completo"/><Input type="url" value={externalVideoUrl} onChange={event => setExternalVideoUrl(event.target.value)} placeholder="Vídeo completo"/></div></section>
          <label className="grid gap-2 text-sm font-medium">Motivo da revisão<Textarea value={revisionNote} onChange={event => setRevisionNote(event.target.value)} /></label>
        </>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        {isPublished ? <Button type="button" variant="outline" asChild><Link href={`/admin/preview/${id}`}>Prévia como no site</Link></Button> : null}
        <Button disabled={update.isPending} className="bg-[#242017] text-white">{update.isPending ? "Salvando..." : isPublished ? "Publicar revisão" : "Salvar texto"}</Button>
      </div>
    </form>
    ) : null}

    {(isPublished || wizardStep === 2) ? (
    <section id="territorio" className="mt-10">
      <h2 className="font-serif text-3xl">Território</h2>
      <p className="mt-1 text-sm text-[#655e52]">Obrigatório para ir ao site.</p>
      <CoverageTaxonomiesPanel publicationId={id} version={data.version} initialIds={data.taxonomies.map(item => item.id)} contentKind={data.contentKind} />
      {data.contentKind === "Cobertura" && <InstitutionalCoveragePanel publication={data} />}
    </section>
    ) : null}

    {(isPublished || wizardStep === 3) ? (
    <section id="midia" className="mt-10">
      <h2 className="font-serif text-3xl">Capa</h2>
      <p className="mt-1 text-sm text-[#655e52]">{data.contentKind === "Fotografia documental" ? "Até 5 fotos com data, local e biografia. Marque a capa." : "Marque a capa. Isso basta para publicar."}</p>
      <CoverageMediaPanel publicationId={id} coverageTitle={data.title} contentKind={data.contentKind} documentaryPhotos={data.contentKind === "Fotografia documental"} existingMedia={data.media.map(media => ({ id: media.id, mediaType: media.mediaType, filename: media.filename, isCover: media.isCover }))} eventNames={data.taxonomies.filter(taxonomy => taxonomy.dimension === "Evento").map(taxonomy => taxonomy.name)} />
    </section>
    ) : null}

    {isPublished ? <section id="home" className="admin-card mt-10 p-6">
      <h2 className="font-serif text-3xl">Home e Histórias recentes</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655e52]">Publicar não coloca a foto na Home. Só o Super Admin marca a vitrine nacional.</p>
      {cover ? <p className="mt-3 text-xs text-[#655e52]">Capa atual: {cover.filename || `#${cover.id}`}</p> : <p className="mt-3 text-xs text-[#8b4d24]">Sem capa marcada — a Home ficaria sem foto.</p>}
      {user?.role === "administrador principal" ? (
        <div className="mt-5 grid gap-4">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={homeOn} onChange={event => setHomeOn(event.currentTarget.checked)} />
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
            {wizardStep > 1 ? <Button type="button" variant="outline" disabled={busy} onClick={() => setWizardStep(current => (current - 1) as 1 | 2 | 3)}>Voltar</Button> : null}
            <Button type="button" variant="outline" disabled={busy} onClick={() => update.mutate(payload)}>Salvar</Button>
            {wizardStep < 3 ? (
              <Button type="button" disabled={busy} className="bg-[#242017] text-white" onClick={goNext}>Continuar</Button>
            ) : canDirect ? (
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
