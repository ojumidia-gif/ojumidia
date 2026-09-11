import { useAuth } from "@/_core/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaAcervoLinkDialog } from "@/components/MediaAcervoLinkDialog";
import { Archive, FilePenLine, Link2, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { MediaAddButton, MediaStage, useMediaStage } from "@/components/MediaStage";
import { mediaSiteGaps } from "@/lib/editorialFlow";
import { AdminPage, AdminFlowGuide, EmptyAdmin, SiteReadiness } from "./_shared";
import {
  acervoSituation,
  acervoSituationLabel,
  acervoUsageKindLabel,
  type AcervoUsage,
} from "@shared/acervoFlow";

type MediaItem = {
  id: number;
  mediaType: "foto" | "vídeo";
  assetUrl: string;
  filename: string | null;
  origin: string;
  credit: string;
  authorization: "Cessão" | "Licença" | "Domínio público" | "Autoral própria" | "Pendente";
  purpose: string;
  publicationAllowed: boolean;
  projectCoverage: string | null;
  terms: string | null;
  usageExpiresAt: Date | null;
  state: "Ativo" | "Arquivado";
  deletedAt: Date | null;
  backgroundEligible: boolean;
  backgroundPriority: number;
  durationSeconds: number | null;
  uploadStatus: "Criado" | "Enviando" | "Enviado" | "Processando" | "Pronto" | "Aprovado" | "Publicado" | "Falhou" | "Cancelado" | "Rejeitado";
  usages?: AcervoUsage[];
};

export default function MediaAdmin() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const utils = trpc.useUtils();
  const context = trpc.partners.myContext.useQuery();
  const partner = context.data?.scope === "partner" ? context.data.partners[0] : null;
  const { data: library, isLoading } = trpc.media.list.useQuery({ limit: 40, offset: 0 }, { refetchInterval: 5000 });
  const data = (library?.items || []).filter(item => !item.deletedAt);
  const stage = useMediaStage();
  const { data: photographers } = trpc.network.executors.useQuery();
  const [photographerId, setPhotographerId] = useState("");
  const [origin, setOrigin] = useState("Operação Ojú");
  const [credit, setCredit] = useState("Equipe Ojú");
  const [purpose, setPurpose] = useState("Uso editorial");
  const [authorization, setAuthorization] = useState<MediaItem["authorization"]>("Autoral própria");
  const [coverage, setCoverage] = useState("");
  const [backgroundEligible, setBackgroundEligible] = useState(false);
  const [backgroundPriority, setBackgroundPriority] = useState(0);
  const [allowed, setAllowed] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editor, setEditor] = useState<MediaItem | null>(null);
  const [linker, setLinker] = useState<MediaItem | null>(null);
  const [usagesItem, setUsagesItem] = useState<MediaItem | null>(null);
  const [trashTarget, setTrashTarget] = useState<MediaItem | null>(null);
  const [deletionNote, setDeletionNote] = useState("");
  const refresh = () => { utils.media.list.invalidate(); utils.media.trashList.invalidate(); utils.media.backgroundClips.invalidate(); utils.media.homeBackgrounds.invalidate(); };
  const create = trpc.media.create.useMutation({ onError: error => toast.error(error.message) });
  const update = trpc.media.update.useMutation({
    onSuccess: () => {
      toast.success("Dados salvos. A próxima ação possível é ligar a um conteúdo.");
      setEditor(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const archive = trpc.media.archive.useMutation({
    onSuccess: () => { toast.success("Mídia fora de uso. Continua no Acervo e pode ser reativada."); refresh(); },
    onError: error => toast.error(error.message),
  });
  const reactivate = trpc.media.reactivate.useMutation({ onSuccess: () => { toast.success("Mídia reativada no Acervo."); refresh(); }, onError: error => toast.error(error.message) });
  const remove = trpc.media.delete.useMutation({
    onSuccess: () => { toast.success("Mídia enviada à Lixeira. Ainda é possível restaurar de lá."); setTrashTarget(null); setDeletionNote(""); refresh(); },
    onError: error => toast.error(error.message),
  });
  const approve = trpc.media.approveUpload.useMutation({ onError: error => toast.error(error.message) });
  const reject = trpc.media.rejectUpload.useMutation({ onSuccess: () => { toast.success("Mídia rejeitada e retirada de uso, com trilha de auditoria."); refresh(); }, onError: error => toast.error(error.message) });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stage.items.length) return toast.error("Selecione fotos ou vídeos.");
    setUploading(true);
    try {
      for (const item of stage.items) {
        const uploaded = item.status === "Pronto" && item.result ? item.result : await stage.uploadOne(item, { partnerId: partner?.partnerId, territoryId: partner?.territories[0]?.id });
        const created = await create.mutateAsync({
          mediaType: item.kind === "foto" ? "foto" : "vídeo",
          durationSeconds: item.kind === "foto" ? undefined : uploaded.durationSeconds,
          assetUrl: uploaded.url,
          storageKey: uploaded.key,
          filename: uploaded.filename,
          uploadId: uploaded.uploadId,
          origin,
          credit,
          photographerId: photographerId ? Number(photographerId) : null,
          authorization,
          purpose,
          projectCoverage: coverage || undefined,
          publicationAllowed: allowed,
          backgroundEligible,
          backgroundPriority,
          partnerId: partner?.partnerId,
          territoryId: partner?.territories[0]?.id,
        });
        if (allowed) await approve.mutateAsync({ id: created.id });
      }
      toast.success("No Acervo, ainda sem conteúdo. A próxima ação possível é ligar a um conteúdo.");
      stage.clear();
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  const allItems = (data || []) as MediaItem[];
  const pendingMediaGaps = Array.from(new Set(allItems.flatMap(item => mediaSiteGaps(item))));

  return (
    <AdminPage eyebrow="Acervo interno" title="Enviar e deixar pronta para o conteúdo.">
      <p className="-mt-4 mb-4 max-w-3xl text-sm leading-6 text-oju-terra-suave">
        Esta área é gestão operacional de mídia. Não é a página pública <Link href="/acervo" className="underline">/acervo</Link>, nem portfólio ou galeria. Uma mídia pode permanecer ainda sem conteúdo. Ligar não publica.
      </p>
      <AdminFlowGuide destinationId="acervo" />
      <div className="mb-6"><SiteReadiness items={pendingMediaGaps} readyText="Acervo em ordem: crédito, autorização e permissão de publicação." /></div>
      <section className="admin-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-[#f6d978] p-3"><UploadCloud className="h-5 w-5" /></div>
          <div>
            <p className="font-serif text-2xl">Adicionar ao Acervo</p>
            <p className="mt-1 text-sm text-oju-terra-suave">Origem, crédito e autorização já vêm preenchidos. Enviar à lixeira é distinto de retirar de uso.</p>
            {principal ? <p className="mt-2 text-sm"><Link href="/admin/lixeira-midias" className="underline">Abrir Lixeira de mídia</Link></p> : null}
          </div>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="grid gap-3 md:col-span-2">
            <MediaAddButton accept="image/*,video/*" label="+ Adicionar fotos e vídeos" counts={{ photos: `Fotos e vídeos selecionados: ${stage.items.length}` }} onFiles={stage.addFiles} />
            <MediaStage items={stage.items} onRemove={stage.remove} onRetry={itemId => { const item = stage.items.find(entry => entry.localId === itemId); if (item) void stage.uploadOne(item, { partnerId: partner?.partnerId, territoryId: partner?.territories[0]?.id }).catch(error => toast.error(error instanceof Error ? error.message : "Falha no reenvio.")); }} />
          </div>
          <label className="grid gap-2 text-sm font-medium">Origem<Input required value={origin} onChange={event => setOrigin(event.target.value)} placeholder="De onde veio a mídia?" /></label>
          <label className="grid gap-2 text-sm font-medium">Fotógrafo na Rede Ojú
            <select value={photographerId} onChange={event => { const next = event.target.value; setPhotographerId(next); const person = photographers?.find(item => String(item.id) === next); if (person) setCredit(person.displayName); }} className="h-10 rounded-md border bg-white px-3">
              <option value="">Somente crédito textual</option>
              {photographers?.map(person => <option key={person.id} value={person.id}>{person.displayName} · {person.specialty}</option>)}
            </select>
            <span className="text-xs font-normal text-oju-terra-suave">O vínculo identifica autoria. Não concede acesso administrativo à publicação.</span>
          </label>
          <label className="grid gap-2 text-sm font-medium">Crédito / autor<Input required value={credit} onChange={event => setCredit(event.target.value)} placeholder="Nome para crédito" /></label>
          <label className="grid gap-2 text-sm font-medium">Finalidade<Input required value={purpose} onChange={event => setPurpose(event.target.value)} placeholder="Uso editorial, documental..." /></label>
          <label className="grid gap-2 text-sm font-medium">Autorização
            <select value={authorization} onChange={event => setAuthorization(event.target.value as MediaItem["authorization"])} className="h-10 rounded-md border bg-white px-3">
              <option>Cessão</option><option>Licença</option><option>Domínio público</option><option>Autoral própria</option><option>Pendente</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">Nota de contexto (só texto, não liga a conteúdo)
            <Input value={coverage} onChange={event => setCoverage(event.target.value)} placeholder="Anotação interna opcional" />
          </label>
          <label className="flex items-center gap-3 pt-7 text-sm font-medium"><input type="checkbox" checked={allowed} onChange={event => setAllowed(event.target.checked)} />Publicação permitida</label>
          {principal ? <label className="flex items-center gap-3 pt-7 text-sm font-medium"><input type="checkbox" checked={backgroundEligible} onChange={event => setBackgroundEligible(event.target.checked)} />Participar do fundo vivo</label> : null}
          {principal && backgroundEligible && <label className="grid gap-2 text-sm font-medium">Prioridade do fundo vivo<Input type="number" min="0" max="99" value={backgroundPriority} onChange={event => setBackgroundPriority(Number(event.target.value))} /></label>}
          <div className="flex justify-end md:col-span-2"><Button disabled={uploading || create.isPending || !stage.items.length} className="bg-oju-verde text-oju-branco">{uploading || create.isPending ? "Enviando..." : "Adicionar ao Acervo"}</Button></div>
        </form>
      </section>
      <section className="mt-7">
        {isLoading ? <p>Carregando acervo...</p> : allItems.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {allItems.map(item => {
              const usages = item.usages || [];
              const situation = acervoSituation({ state: item.state, deletedAt: item.deletedAt, usageCount: usages.length });
              const situationLabel = acervoSituationLabel(situation, usages);
              return (
                <article key={item.id} className="admin-card overflow-hidden">
                  <div className="aspect-[4/3] bg-oju-papel">{item.mediaType === "vídeo" ? <video src={item.assetUrl} className="h-full w-full object-contain" controls /> : <img src={item.assetUrl} alt={item.filename || "Mídia do Acervo"} className="h-full w-full object-contain" />}</div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.filename || "Arquivo sem nome"}</p>
                        <p className="mt-1 text-xs text-oju-terra-suave">Crédito: {item.credit}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-oju-verde-profundo">{situationLabel}</p>
                    {usages.length > 1 ? <button type="button" className="mt-1 text-xs underline" onClick={() => setUsagesItem(item)}>Consultar usos</button> : null}
                    {usages.length === 1 ? <p className="mt-1 text-xs text-oju-terra-suave">{acervoUsageKindLabel(usages[0])}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className="rounded-full bg-oju-papel px-2 py-1 capitalize">{item.mediaType}</span>
                      <span className={`rounded-full px-2 py-1 ${item.publicationAllowed ? "bg-oju-verde/15 text-oju-verde-profundo" : "bg-[#f3e3d2] text-[#8b4d24]"}`}>{item.publicationAllowed ? "Publicação permitida" : "Pendente"}</span>
                      {item.durationSeconds ? <span className="rounded-full bg-oju-papel px-2 py-1">{item.durationSeconds}s</span> : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-oju-terra/10 pt-4">
                      {item.uploadStatus === "Pronto" ? <Button size="sm" className="bg-oju-verde text-oju-branco" onClick={() => approve.mutate({ id: item.id }, { onSuccess: () => { toast.success("Pronta para ligar a um conteúdo."); refresh(); } })}>Aprovar para o conteúdo</Button> : null}
                      <Button size="sm" variant="outline" onClick={() => setEditor(item)}><FilePenLine className="mr-1 h-3.5 w-3.5" />Editar dados</Button>
                      {item.state === "Ativo" ? <Button size="sm" variant="outline" onClick={() => setLinker(item)}><Link2 className="mr-1 h-3.5 w-3.5" />Ligar a um conteúdo</Button> : null}
                      {item.state === "Ativo" ? <Button size="sm" variant="outline" onClick={() => archive.mutate({ id: item.id })}><Archive className="mr-1 h-3.5 w-3.5" />Retirar de uso</Button> : <Button size="sm" variant="outline" onClick={() => reactivate.mutate({ id: item.id })}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reativar</Button>}
                      {principal ? <Button size="sm" variant="outline" className="border-[#8b4d24] text-[#8b4d24]" onClick={() => setTrashTarget(item)}><Trash2 className="mr-1 h-3.5 w-3.5" />Enviar à lixeira</Button> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <EmptyAdmin text="O Acervo ainda não contém mídias. Envie fotos ou vídeos com seus direitos, créditos e permissões. Permanecer sem vínculo é um estado válido." />}
      </section>
      {editor && <MediaEditor item={editor} canCurateHome={principal} saving={update.isPending} onClose={() => setEditor(null)} onSave={values => update.mutate(values)} onLinkNext={() => { const current = editor; setEditor(null); setLinker(current); }} />}
      {linker && <MediaAcervoLinkDialog item={linker} onClose={() => setLinker(null)} onLinked={() => { setLinker(null); refresh(); }} />}
      {usagesItem && <UsagesDialog item={usagesItem} onClose={() => setUsagesItem(null)} />}
      {trashTarget && (
        <AlertDialog open onOpenChange={open => { if (!open) { setTrashTarget(null); setDeletionNote(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enviar à lixeira?</AlertDialogTitle>
              <AlertDialogDescription>“{trashTarget.filename || "Esta mídia"}” sai do Acervo ativo. Isto não é retirar de uso. Restauração volta como fora de uso, não como ativa.</AlertDialogDescription>
            </AlertDialogHeader>
            <label className="grid gap-2 text-sm font-medium">Motivo<Textarea value={deletionNote} onChange={event => setDeletionNote(event.target.value)} placeholder="Ex.: autorização retirada ou arquivo substituído." /></label>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction disabled={deletionNote.trim().length < 3} className="bg-[#8b4d24] text-white hover:bg-[#723b1a]" onClick={event => { event.preventDefault(); remove.mutate({ id: trashTarget.id, note: deletionNote.trim() }); }}>Enviar à lixeira</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AdminPage>
  );
}

function UsagesDialog({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const usages = item.usages || [];
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Onde esta mídia está sendo usada</DialogTitle>
          <DialogDescription>O vínculo não é um estado da mídia. É uma relação derivada dos objetos que a utilizam.</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-2 text-sm">
          {usages.map(usage => (
            <li key={`${usage.kind}-${usage.id}`}>{acervoUsageKindLabel(usage)}: {usage.title || usage.label}</li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function MediaEditor({ item, canCurateHome, saving, onClose, onSave, onLinkNext }: {
  item: MediaItem;
  canCurateHome?: boolean;
  saving: boolean;
  onClose: () => void;
  onLinkNext: () => void;
  onSave: (values: { id: number; origin: string; credit: string; authorization: MediaItem["authorization"]; purpose: string; projectCoverage: string | null; terms: string | null; usageExpiresAt: Date | null; publicationAllowed: boolean; backgroundPriority: number }) => void;
}) {
  const [origin, setOrigin] = useState(item.origin);
  const [credit, setCredit] = useState(item.credit);
  const [authorization, setAuthorization] = useState<MediaItem["authorization"]>(item.authorization);
  const [purpose, setPurpose] = useState(item.purpose);
  const [projectCoverage, setProjectCoverage] = useState(item.projectCoverage || "");
  const [terms, setTerms] = useState(item.terms || "");
  const [allowed, setAllowed] = useState(item.publicationAllowed);
  const [priority, setPriority] = useState(item.backgroundPriority);
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar dados</DialogTitle>
          <DialogDescription>Altera somente metadados. Não cria vínculo, não publica e não muda o arquivo. Depois de salvar, a próxima ação possível é ligar a um conteúdo.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={event => { event.preventDefault(); onSave({ id: item.id, origin, credit, authorization, purpose, projectCoverage: projectCoverage || null, terms: terms || null, usageExpiresAt: item.usageExpiresAt, publicationAllowed: allowed, backgroundPriority: priority }); }}>
          <label className="grid gap-2 text-sm font-medium">Origem<Input required value={origin} onChange={event => setOrigin(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Crédito / autor<Input required value={credit} onChange={event => setCredit(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Autorização
            <select value={authorization} onChange={event => setAuthorization(event.target.value as MediaItem["authorization"])} className="h-10 rounded border bg-white px-3">
              <option>Cessão</option><option>Licença</option><option>Domínio público</option><option>Autoral própria</option><option>Pendente</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">Finalidade<Input required value={purpose} onChange={event => setPurpose(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Nota de contexto (só texto, não liga a conteúdo)<Input value={projectCoverage} onChange={event => setProjectCoverage(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-medium">Termos e observações<Textarea value={terms} onChange={event => setTerms(event.target.value)} /></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={allowed} onChange={event => setAllowed(event.target.checked)} />Publicação permitida</label>
          {canCurateHome && item.mediaType === "vídeo" && <label className="grid gap-2 text-sm font-medium">Prioridade do fundo vivo<Input type="number" min="0" max="99" value={priority} onChange={event => setPriority(Number(event.target.value))} /></label>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" variant="outline" onClick={onLinkNext}>Ligar a um conteúdo</Button>
            <Button disabled={saving} className="bg-oju-verde text-oju-branco">{saving ? "Salvando..." : "Salvar dados"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
