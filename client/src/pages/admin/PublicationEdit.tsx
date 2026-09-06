import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { editorialPipeline, nextEditorialAction, publicationSiteGaps } from "@/lib/editorialFlow";
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
  "Fotografia documental": "Portal → coleções fotográficas",
};

export default function PublicationEdit() {
  const { user } = useAuth();
  const [, params] = useRoute("/admin/editar/:id"); const id = Number(params?.id);
  const utils = trpc.useUtils(); const { data, isLoading } = trpc.editorial.preview.useQuery({ id }, { enabled: Boolean(id) });
  const [title, setTitle] = useState(""); const [subtitle, setSubtitle] = useState(""); const [summary, setSummary] = useState(""); const [body, setBody] = useState(""); const [teamCredit, setTeamCredit] = useState(""); const [revisionNote, setRevisionNote] = useState(""); const [externalAlbumUrl, setExternalAlbumUrl] = useState(""); const [externalVideoUrl, setExternalVideoUrl] = useState("");
  useEffect(() => { if (data) { setTitle(data.title); setSubtitle(data.subtitle || ""); setSummary(data.summary || ""); setBody(data.body || ""); setTeamCredit(data.teamCredit || ""); setExternalAlbumUrl(data.externalAlbumUrl || ""); setExternalVideoUrl(data.externalVideoUrl || ""); } }, [data]);
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
        Publicada: "Publicado no portal.",
      };
      toast.success(messages[result.status] || "Etapa editorial atualizada.");
      utils.editorial.adminList.invalidate();
      utils.editorial.preview.invalidate({ id });
    },
    onError: error => toast.error(error.message),
  });
  const schedule = trpc.editorial.schedulePublish.useMutation({ onSuccess: () => { toast.success("Publicação programada."); utils.editorial.preview.invalidate({ id }); utils.editorial.adminList.invalidate(); }, onError: error => toast.error(error.message) });
  const [scheduledAt, setScheduledAt] = useState("");
  if (isLoading) return <DashboardLayout><p>Carregando publicação...</p></DashboardLayout>;
  if (!data) return <DashboardLayout><p>Publicação não encontrada.</p></DashboardLayout>;
  const nameOf = (personId: number | null) => data.contributors.find(person => person.id === personId)?.name || "—";
  const isPublished = data.status === "Publicada";
  const cover = data.media.find(item => item.isCover) || data.media[0];
  const nextAction = nextEditorialAction(user?.role, data.status);
  const gaps = publicationSiteGaps(data);
  const payload = { id, expectedVersion: data.version, title, subtitle: subtitle || null, summary: summary || null, body: body || null, teamCredit: teamCredit || null, externalAlbumUrl: externalAlbumUrl || null, externalVideoUrl: externalVideoUrl || null, revisionNote: revisionNote || undefined };
  const saveThenAdvance = () => {
    update.mutate(payload, {
      onSuccess: () => advance.mutate({ id, expectedVersion: data.version + 1 }),
    });
  };
  return <DashboardLayout><div className="mx-auto max-w-4xl">
    <Link href="/admin/publicacoes" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Voltar aos conteúdos</Link>
    <p className="mt-6 text-xs font-bold uppercase tracking-[.12em] text-[#806817]">{data.contentKind} · {destinations[data.contentKind] || "Portal"}</p>
    <h1 className="mt-2 font-serif text-5xl">{isPublished ? "Revisar publicação" : "Preparar o conteúdo"}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#655e52]">Um caminho só: texto, território, fotos. O site recebe depois da revisão e da aprovação.</p>
    <nav className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
      <a href="#texto" className="rounded-full bg-[#eee9dc] px-3 py-1.5">1. Texto</a>
      <a href="#territorio" className="rounded-full bg-[#eee9dc] px-3 py-1.5">2. Território</a>
      <a href="#midia" className="rounded-full bg-[#eee9dc] px-3 py-1.5">3. Fotos e vídeos</a>
    </nav>
    <ol className="mt-6 grid gap-2 sm:grid-cols-4 text-sm">
      {editorialPipeline.map((step, index) => {
        const currentIndex = editorialPipeline.indexOf(data.status as typeof editorialPipeline[number]);
        const active = data.status === step || (data.status === "Arquivada" && step === "Publicada");
        const done = currentIndex > index;
        return (
          <li key={step} className={`rounded-xl px-4 py-3 ${active ? "bg-[#fff7dc] ring-1 ring-[#806817]/40" : done ? "bg-[#e8f0e4]" : "bg-[#eee9dc]"}`}>
            <strong>{index + 1}. {step === "Rascunho" ? "Preparar" : step === "Em revisão" ? "Revisar" : step === "Aprovada" ? "Aprovar" : "No ar"}</strong>
            <p className="text-xs text-[#655e52]">{step}</p>
          </li>
        );
      })}
    </ol>
    {data.status !== "Publicada" ? <div className="mt-5"><SiteReadiness items={gaps} readyText="Texto, capa e território ok. Siga o próximo passo editorial — o site só recebe depois da revisão e da aprovação." /></div> : null}
    {nextAction && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#806817]/30 bg-[#fff7dc] p-4">
      <p className="text-sm text-[#655e52]"><strong className="text-[#242017]">Próximo passo:</strong> {nextAction.hint}</p>
      <Button disabled={advance.isPending || update.isPending} className="bg-[#242017] text-white" onClick={() => data.status === "Rascunho" ? saveThenAdvance() : advance.mutate({ id, expectedVersion: data.version })}>
        {data.status === "Rascunho" ? "Salvar e enviar para revisão" : nextAction.label}
      </Button>
    </div>}
    {conflict && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b95140]/30 bg-[#fff1ec] p-4 text-sm text-[#7a3126]"><span>Este conteúdo mudou em outra sessão. Recarregue para revisar a versão atual antes de salvar.</span><Button size="sm" type="button" onClick={() => { setConflict(false); utils.editorial.preview.invalidate({ id }); }}>Recarregar versão</Button></div>}
    {isPublished && <div className="mt-4 rounded-xl border border-[#806817]/30 bg-[#fff7dc] p-4 text-sm text-[#655e52]"><strong className="text-[#5d4700]">Conteúdo publicado.</strong> As correções entram no portal imediatamente e ficam registradas no histórico editorial.</div>}
    <section className="mt-6 grid gap-3 rounded-2xl border border-[#242017]/10 bg-[#eee9dc] p-5 text-sm sm:grid-cols-2"><p><strong>Criação:</strong> {nameOf(data.createdBy)} · {new Date(data.createdAt).toLocaleString("pt-BR")}</p><p><strong>Última edição:</strong> {data.editedBy ? nameOf(data.editedBy) : "Ainda não editada"}</p><p><strong>Aprovação:</strong> {data.approvedBy ? nameOf(data.approvedBy) : "Pendente"}</p><p><strong>Publicação:</strong> {data.publishedAt ? new Date(data.publishedAt).toLocaleString("pt-BR") : "Pendente"}</p></section>
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
      <h2 className="font-serif text-3xl">2. Território e relações</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655e52]">Ligue o conteúdo ao chão autorizado. Sem território, o portal não considera o material pronto.</p>
      {data.contentKind !== "Fotografia documental" && <CoverageTaxonomiesPanel publicationId={id} version={data.version} initialIds={data.taxonomies.map(item => item.id)} contentKind={data.contentKind} />}
      {data.contentKind === "Cobertura" && <InstitutionalCoveragePanel publication={data} />}
    </section>
    <section id="midia" className="mt-10">
      <h2 className="font-serif text-3xl">3. Fotos e vídeos</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655e52]">Até 5 fotos e 2 vídeos curtos, com crédito. Marque a capa. O portal não recebe arquivo solto.</p>
      <CoverageMediaPanel publicationId={id} coverageTitle={data.title} contentKind={data.contentKind} documentaryPhotos={data.contentKind === "Fotografia documental"} existingMedia={data.media.map(media => ({ id: media.id, mediaType: media.mediaType, filename: media.filename, isCover: media.isCover }))} eventNames={data.taxonomies.filter(taxonomy => taxonomy.dimension === "Evento").map(taxonomy => taxonomy.name)} />
    </section>
  </div></DashboardLayout>;
}
