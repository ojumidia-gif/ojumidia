import { MediaAddButton, MediaStage, useMediaStage } from "@/components/MediaStage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Film, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin, ThreeStepsGuide } from "./_shared";
import { useAuth } from "@/_core/hooks/useAuth";
import { HOME_MINICLIP_DISPLAY_SECONDS, HOME_MINICLIP_MAX_DURATION_SECONDS, HOME_MINICLIP_SEQUENCE_LIMIT, HOME_MINICLIP_TRANSITION_MS } from "@shared/const";
import { parseCaptionTrackUrl } from "@shared/homeMiniclip";

export default function MiniclipsAdmin() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  return principal ? <HomeMiniclipsDesk /> : <ProductionMiniclipsDesk />;
}

function ProductionMiniclipsDesk() {
  const utils = trpc.useUtils();
  const context = trpc.partners.myContext.useQuery();
  const partner = context.data?.scope === "partner" ? context.data.partners[0] : null;
  const { data: clips, isLoading } = trpc.media.eligibleMiniclips.useQuery(undefined, { refetchInterval: 5000 });
  const stage = useMediaStage("miniclipe");
  const [origin, setOrigin] = useState("Operação Ojú");
  const [credit, setCredit] = useState("Equipe Ojú");
  const [uploading, setUploading] = useState(false);
  const create = trpc.media.create.useMutation({ onError: error => toast.error(error.message) });
  const approve = trpc.media.approveUpload.useMutation({ onError: error => toast.error(error.message) });

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    const item = stage.items[0];
    if (!item) return toast.error("Selecione um miniclipe em vídeo.");
    if (!item.file.type.startsWith("video/")) return toast.error("Esta área aceita apenas vídeo.");
    setUploading(true);
    try {
      const uploaded = item.status === "Pronto" && item.result ? item.result : await stage.uploadOne(item, { partnerId: partner?.partnerId, territoryId: partner?.territories[0]?.id });
      if (!uploaded.durationSeconds) throw new Error("Não foi possível confirmar a duração do miniclipe.");
      const created = await create.mutateAsync({
        mediaType: "vídeo",
        assetUrl: uploaded.url,
        storageKey: uploaded.key,
        filename: uploaded.filename,
        uploadId: uploaded.uploadId,
        origin,
        credit,
        purpose: "Miniclipe de contratação · até 60 segundos",
        authorization: "Autoral própria",
        durationSeconds: uploaded.durationSeconds,
        publicationAllowed: true,
        backgroundEligible: false,
        partnerId: partner?.partnerId,
        territoryId: partner?.territories[0]?.id,
      });
      await approve.mutateAsync({ id: created.id });
      toast.success("Miniclipe no Acervo. Ligue-o em Pedidos. A Home continua com a Equipe Ojú.");
      stage.clear();
      setOrigin("");
      setCredit("");
      utils.media.eligibleMiniclips.invalidate();
      utils.media.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o miniclipe.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminPage eyebrow="Produção e monetização" title="Miniclipes da contratação.">
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-oju-terra-suave">Você publica o vídeo curto (até 60s) e liga à cobertura paga. Isso não muda a abertura da Home. A Equipe Ojú é quem escolhe o fundo vivo nacional.</p>
      <ThreeStepsGuide steps={["Envie o vídeo de até 60s.", "Ligue-o ao pedido em Pedidos.", "A Home nacional continua com a Equipe Ojú."]} />
      <section className="admin-card p-6">
        <div className="flex gap-4">
          <div className="rounded-xl bg-[#f6d978] p-3"><Film className="h-5 w-5" /></div>
          <div>
            <p className="font-serif text-2xl">Enviar miniclipe</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-oju-terra-suave">Crédito já vem como Equipe Ojú. Depois, em Pedidos, defina o miniclipe da contratação.</p>
          </div>
        </div>
        <form onSubmit={upload} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="grid gap-3 md:col-span-2">
            <MediaAddButton accept="video/*" multiple={false} label="+ Adicionar miniclipe" counts={{ photos: `Miniclipe ${stage.items.length} / 1` }} onFiles={files => stage.addFiles(files.slice(0, 1))} />
            <MediaStage items={stage.items} onRemove={stage.remove} onRetry={itemId => { const item = stage.items.find(entry => entry.localId === itemId); if (item) void stage.uploadOne(item, { partnerId: partner?.partnerId, territoryId: partner?.territories[0]?.id }).catch(error => toast.error(error instanceof Error ? error.message : "Falha no reenvio.")); }} />
          </div>
          <label className="grid gap-2 text-sm font-medium">Origem<Input required value={origin} onChange={event => setOrigin(event.target.value)} placeholder="Ex.: Cobertura contratada" /></label>
          <label className="grid gap-2 text-sm font-medium">Crédito / autor<Input required value={credit} onChange={event => setCredit(event.target.value)} placeholder="Nome para crédito" /></label>
          <div className="flex flex-wrap justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" asChild><Link href="/admin/solicitacoes">Ir aos pedidos</Link></Button>
            <Button disabled={uploading || create.isPending} className="bg-oju-verde text-oju-branco"><UploadCloud className="mr-2 h-4 w-4" />{uploading ? "Enviando..." : "Guardar miniclipe"}</Button>
          </div>
        </form>
      </section>
      <section className="mt-7">
        <p className="editorial-kicker">Prontos para contratação</p>
        <h2 className="mt-2 font-serif text-3xl">Vídeos de até 60 segundos</h2>
        {isLoading ? <p className="mt-4">Carregando miniclipes...</p> : clips?.length ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {clips.map(clip => (
              <article key={clip.id} className="admin-card overflow-hidden">
                <video muted loop playsInline controls className="aspect-video w-full bg-oju-verde-profundo" src={clip.assetUrl} />
                <div className="p-5">
                  <p className="font-medium">{clip.filename || "Miniclipe sem nome"}</p>
                  <p className="mt-1 text-xs text-oju-terra-suave">{clip.credit} · {clip.durationSeconds}s</p>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="mt-5"><EmptyAdmin text="Ainda não há miniclipe autorizado na sua carteira. Envie o primeiro vídeo curto." /></div>}
      </section>
    </AdminPage>
  );
}

function HomeMiniclipsDesk() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { data: clips, isLoading } = trpc.media.backgroundClips.useQuery(undefined, { refetchInterval: 5000 });
  const stage = useMediaStage("miniclipe");
  const [origin, setOrigin] = useState("");
  const [credit, setCredit] = useState("");
  const [priority, setPriority] = useState("99");
  const [captionTrackUrl, setCaptionTrackUrl] = useState("");
  const [clipCaptions, setClipCaptions] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const { data: curation } = trpc.media.homeMiniclipCuration.useQuery(undefined, { enabled: user?.role === "administrador principal" });
  const create = trpc.media.createBackgroundClip.useMutation({ onError: error => toast.error(error.message) });
  const setBackground = trpc.media.setBackgroundClip.useMutation({ onSuccess: () => { toast.success("Fundo vivo atualizado."); utils.media.backgroundClips.invalidate(); utils.media.homeBackgrounds.invalidate(); }, onError: error => toast.error(error.message) });
  const setCaption = trpc.media.setBackgroundCaption.useMutation({ onSuccess: () => { toast.success("Faixa de legenda atualizada."); utils.media.backgroundClips.invalidate(); }, onError: error => toast.error(error.message) });
  useEffect(() => {
    if (!clips) return;
    setClipCaptions(current => {
      const next = { ...current };
      for (const clip of clips) {
        if (next[clip.id] === undefined) next[clip.id] = parseCaptionTrackUrl(clip.terms) || "";
      }
      return next;
    });
  }, [clips]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    const item = stage.items[0];
    if (!item) return toast.error("Selecione um miniclipe em vídeo.");
    if (!item.file.type.startsWith("video/")) return toast.error("Esta área aceita apenas vídeo.");
    setUploading(true);
    try {
      const uploaded = item.status === "Pronto" && item.result ? item.result : await stage.uploadOne(item);
      if (!uploaded.durationSeconds) throw new Error("Não foi possível confirmar a duração do miniclipe.");
      await create.mutateAsync({ assetUrl: uploaded.url, storageKey: uploaded.key, filename: uploaded.filename, origin, credit, purpose: "Fundo vivo da Home · miniclipe documental", authorization: "Autoral própria", durationSeconds: uploaded.durationSeconds, priority: Number(priority) || 0, captionTrackUrl: captionTrackUrl.trim() || undefined });
      toast.success("Miniclipe adicionado à sequência do fundo vivo.");
      stage.clear(); setOrigin(""); setCredit(""); setCaptionTrackUrl("");
      utils.media.backgroundClips.invalidate(); utils.media.homeBackgrounds.invalidate();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível adicionar o miniclipe."); } finally { setUploading(false); }
  }

  return (
    <AdminPage eyebrow="Equipe Ojú · Home nacional" title="Miniclipes do fundo vivo.">
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-oju-terra-suave">Esta sequência alimenta só a Home nacional. Admin comum publica miniclipe de contratação; não cura este fundo. Publicações editoriais continuam com até 5 fotos e 2 miniclipes; o fundo vivo é outra fila, com até {HOME_MINICLIP_SEQUENCE_LIMIT} clipes.</p>
      <section className="admin-card p-6"><div className="flex gap-4"><div className="rounded-xl bg-[#f6d978] p-3"><Film className="h-5 w-5" /></div><div><p className="font-serif text-2xl">Adicionar miniclipe</p><p className="mt-1 max-w-2xl text-sm leading-6 text-oju-terra-suave">Esta área é só para miniclipe do fundo vivo — não misture com foto ou vídeo de cobertura. A sequência comporta até quatro vídeos; a Home mostra um por vez.</p></div></div><form onSubmit={upload} className="mt-6 grid gap-4 md:grid-cols-2"><div className="grid gap-3 md:col-span-2"><MediaAddButton accept="video/*" multiple={false} label="+ Adicionar miniclipe" counts={{ photos: `Miniclipe ${stage.items.length} / 1`, miniclips: `Na sequência: ${clips?.filter(clip => clip.backgroundEligible).length || 0} / 4` }} onFiles={files => stage.addFiles(files.slice(0, 1))} /><MediaStage items={stage.items} onRemove={stage.remove} onRetry={itemId => { const item = stage.items.find(entry => entry.localId === itemId); if (item) void stage.uploadOne(item).catch(error => toast.error(error instanceof Error ? error.message : "Falha no reenvio.")); }} /></div><label className="grid gap-2 text-sm font-medium">Origem<Input required value={origin} onChange={event => setOrigin(event.target.value)} placeholder="Ex.: Produção original Ojú Mídia" /></label><label className="grid gap-2 text-sm font-medium">Crédito / autor<Input required value={credit} onChange={event => setCredit(event.target.value)} placeholder="Nome para crédito" /></label><label className="grid gap-2 text-sm font-medium">Ordem na sequência<Input required min="0" max="99" type="number" value={priority} onChange={event => setPriority(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium md:col-span-2">Faixa de legenda opcional (.vtt)<Input value={captionTrackUrl} onChange={event => setCaptionTrackUrl(event.target.value)} placeholder="/media-storage/.../miniclipe.vtt" /><span className="text-xs font-normal leading-5 text-oju-terra-suave">Somente texto autorizado pela casa. Não use ponto, canto ou nomes sagrados como decoração.</span></label><p className="self-end text-xs leading-5 text-oju-terra-suave">A sequência comporta até quatro miniclipes; o maior número aparece primeiro. Remover da sequência não apaga o vídeo do Acervo.</p><div className="flex justify-end md:col-span-2"><Button disabled={uploading || create.isPending} className="bg-oju-verde text-oju-branco"><UploadCloud className="mr-2 h-4 w-4" />{uploading ? "Enviando..." : "Adicionar à sequência"}</Button></div></form></section>
      <section className="admin-card mt-7 p-6"><p className="editorial-kicker">Equipe Ojú</p><h2 className="mt-2 font-serif text-3xl">Tempo entre miniclipes</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-oju-terra-suave">A Home mostra no máximo {HOME_MINICLIP_DISPLAY_SECONDS} segundos de cada miniclipe, com transição de {HOME_MINICLIP_TRANSITION_MS} milissegundos. O arquivo pode ter até {HOME_MINICLIP_MAX_DURATION_SECONDS} segundos; o restante só aparece em Assistir miniclipe, em outra aba. Esta regra não é editável.</p>{curation ? <p className="mt-4 text-sm text-oju-terra-suave">Curadoria anônima desta sessão pública: {curation.watch} assistir · {curation.mute} mudo · {curation.unmute} som. Sem cookie e sem identidade.</p> : null}</section>
      <section className="mt-7"><div className="mb-4"><p className="editorial-kicker">Fundo vivo atual</p><h2 className="mt-2 font-serif text-3xl">Sequência de miniclipes</h2></div>{isLoading ? <p>Carregando miniclipes...</p> : clips?.length ? <div className="grid gap-5 md:grid-cols-2">{clips.map(clip => <article key={clip.id} className="admin-card overflow-hidden"><video muted loop playsInline controls className="aspect-video w-full bg-oju-verde-profundo" src={clip.assetUrl} /><div className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{clip.filename || "Miniclipe sem nome"}</p><p className="mt-1 text-xs text-oju-terra-suave">{clip.credit} · ordem {clip.backgroundPriority}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${clip.backgroundEligible ? "bg-oju-verde/15 text-oju-verde-profundo" : "bg-oju-papel text-oju-terra-suave"}`}>{clip.backgroundEligible ? "Na sequência" : "Guardado no Acervo"}</span></div><p className="mt-4 text-sm text-oju-terra-suave">Origem: {clip.origin}</p><div className="mt-4 grid gap-2"><label className="text-xs font-medium text-oju-terra-suave">Legenda .vtt autorizada<Input className="mt-1" value={clipCaptions[clip.id] ?? ""} onChange={event => setClipCaptions(current => ({ ...current, [clip.id]: event.target.value }))} placeholder="/media-storage/.../miniclipe.vtt" /></label><Button size="sm" variant="outline" disabled={setCaption.isPending} onClick={() => setCaption.mutate({ id: clip.id, captionTrackUrl: clipCaptions[clip.id]?.trim() || undefined })}>Salvar legenda</Button></div><div className="mt-5 flex gap-2">{clip.backgroundEligible ? <Button size="sm" variant="outline" disabled={setBackground.isPending} onClick={() => setBackground.mutate({ id: clip.id, active: false })}>Remover da sequência</Button> : <Button size="sm" disabled={setBackground.isPending} onClick={() => setBackground.mutate({ id: clip.id, active: true, priority: clip.backgroundPriority || 99 })}>Adicionar à sequência</Button>}</div></div></article>)}</div> : <EmptyAdmin text="Ainda não há miniclipes. Envie o primeiro vídeo para estabelecer o fundo vivo documental da Home." />}</section>
    </AdminPage>
  );
}
