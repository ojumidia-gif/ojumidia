import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Film, Save, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";
import { useAuth } from "@/_core/hooks/useAuth";

export default function MiniclipsAdmin() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { data: clips, isLoading } = trpc.media.backgroundClips.useQuery(undefined, { refetchInterval: 5000 });
  const { data: transition } = trpc.media.homeBackgroundConfig.useQuery();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [origin, setOrigin] = useState("");
  const [credit, setCredit] = useState("");
  const [priority, setPriority] = useState("99");
  const [displaySeconds, setDisplaySeconds] = useState(transition?.displaySeconds?.toString() || "14");
  const [transitionMilliseconds, setTransitionMilliseconds] = useState(transition?.transitionMilliseconds?.toString() || "1100");
  const [uploading, setUploading] = useState(false);
  const create = trpc.media.createBackgroundClip.useMutation({ onError: error => toast.error(error.message) });
  const setBackground = trpc.media.setBackgroundClip.useMutation({ onSuccess: () => { toast.success("Fundo vivo atualizado."); utils.media.backgroundClips.invalidate(); utils.media.homeBackgrounds.invalidate(); }, onError: error => toast.error(error.message) });
  const saveTransition = trpc.media.saveHomeBackgroundConfig.useMutation({ onSuccess: () => { toast.success("Transição do fundo vivo atualizada."); utils.media.homeBackgroundConfig.invalidate(); }, onError: error => toast.error(error.message) });
  useEffect(() => { if (transition) { setDisplaySeconds(transition.displaySeconds.toString()); setTransitionMilliseconds(transition.transitionMilliseconds.toString()); } }, [transition]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return toast.error("Selecione um miniclipe em vídeo.");
    if (!file.type.startsWith("video/")) return toast.error("Esta área aceita apenas vídeo.");
    setUploading(true);
    try {
      const response = await fetch("/api/media/upload", { method: "POST", headers: { "Content-Type": file.type, "x-file-name": file.name }, body: file });
      const uploaded = await response.json();
      if (!response.ok) throw new Error(uploaded.message || "O envio não foi concluído.");
      await create.mutateAsync({ assetUrl: uploaded.url, storageKey: uploaded.key, filename: uploaded.filename, origin, credit, purpose: "Fundo vivo da Home · miniclipe documental", authorization: "Autoral própria", durationSeconds: uploaded.durationSeconds, priority: Number(priority) || 0 });
      toast.success("Miniclipe adicionado à sequência do fundo vivo.");
      setFile(null); setOrigin(""); setCredit(""); if (input.current) input.current.value = "";
      utils.media.backgroundClips.invalidate(); utils.media.homeBackgrounds.invalidate();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível adicionar o miniclipe."); } finally { setUploading(false); }
  }

  return <AdminPage eyebrow="Curadoria visual" title="Miniclipes do fundo vivo.">
    <section className="admin-card p-6"><div className="flex gap-4"><div className="rounded-xl bg-[#f6d978] p-3"><Film className="h-5 w-5" /></div><div><p className="font-serif text-2xl">Adicionar miniclipe</p><p className="mt-1 max-w-2xl text-sm leading-6 text-[#655e52]">Administradores podem adicionar, ativar, ordenar ou retirar vídeos da sequência. A Home mostra apenas um vídeo por vez; cada item continua no Acervo com origem, crédito e autorização documentados.</p></div></div><form onSubmit={upload} className="mt-6 grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-medium md:col-span-2">Arquivo de vídeo<input ref={input} required type="file" accept="video/*" onChange={event => setFile(event.target.files?.[0] || null)} className="rounded-md border bg-white p-2 text-sm" />{file && <span className="flex gap-2 text-xs text-[#496b3b]"><CheckCircle2 className="h-4 w-4" />{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>}</label><label className="grid gap-2 text-sm font-medium">Origem<Input required value={origin} onChange={event => setOrigin(event.target.value)} placeholder="Ex.: Produção original Ojú Mídia" /></label><label className="grid gap-2 text-sm font-medium">Crédito / autor<Input required value={credit} onChange={event => setCredit(event.target.value)} placeholder="Nome para crédito" /></label><label className="grid gap-2 text-sm font-medium">Ordem na sequência<Input required min="0" max="99" type="number" value={priority} onChange={event => setPriority(event.target.value)} /></label><p className="self-end text-xs leading-5 text-[#655e52]">A sequência comporta até quatro miniclipes; o maior número aparece primeiro. Remover da sequência não apaga o vídeo do Acervo.</p><div className="flex justify-end md:col-span-2"><Button disabled={uploading || create.isPending} className="bg-[#242017] text-white"><UploadCloud className="mr-2 h-4 w-4" />{uploading ? "Enviando..." : "Adicionar à sequência"}</Button></div></form></section>
    {user?.role === "administrador principal" && <section className="admin-card mt-7 p-6"><p className="editorial-kicker">Super Admin</p><h2 className="mt-2 font-serif text-3xl">Tempo entre miniclipes</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#655e52]">O portal faz uma transição suave entre vídeos da sequência. Esta configuração não altera a duração original dos arquivos nem autoriza novas mídias.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Tempo de exibição (segundos)<Input min="5" max="60" type="number" value={displaySeconds} onChange={event => setDisplaySeconds(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">Duração da transição (milissegundos)<Input min="300" max="3000" step="100" type="number" value={transitionMilliseconds} onChange={event => setTransitionMilliseconds(event.target.value)} /></label></div><Button className="mt-5 bg-[#242017] text-white" disabled={saveTransition.isPending} onClick={() => saveTransition.mutate({ displaySeconds: Number(displaySeconds), transitionMilliseconds: Number(transitionMilliseconds) })}><Save className="mr-2 h-4 w-4" />Salvar transição</Button></section>}
    <section className="mt-7"><div className="mb-4"><p className="editorial-kicker">Fundo vivo atual</p><h2 className="mt-2 font-serif text-3xl">Sequência de miniclipes</h2></div>{isLoading ? <p>Carregando miniclipes...</p> : clips?.length ? <div className="grid gap-5 md:grid-cols-2">{clips.map(clip => <article key={clip.id} className="admin-card overflow-hidden"><video muted loop playsInline controls className="aspect-video w-full bg-[#242017]" src={clip.assetUrl} /><div className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{clip.filename || "Miniclipe sem nome"}</p><p className="mt-1 text-xs text-[#655e52]">{clip.credit} · ordem {clip.backgroundPriority}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${clip.backgroundEligible ? "bg-[#d8eadc] text-[#2c683b]" : "bg-[#eee9dc] text-[#655e52]"}`}>{clip.backgroundEligible ? "Na sequência" : "Guardado no Acervo"}</span></div><p className="mt-4 text-sm text-[#655e52]">Origem: {clip.origin}</p><div className="mt-5 flex gap-2">{clip.backgroundEligible ? <Button size="sm" variant="outline" disabled={setBackground.isPending} onClick={() => setBackground.mutate({ id: clip.id, active: false })}>Remover da sequência</Button> : <Button size="sm" disabled={setBackground.isPending} onClick={() => setBackground.mutate({ id: clip.id, active: true, priority: clip.backgroundPriority || 99 })}>Adicionar à sequência</Button>}</div></div></article>)}</div> : <EmptyAdmin text="Ainda não há miniclipes. Envie o primeiro vídeo para estabelecer o fundo vivo documental da Home." />}</section>
  </AdminPage>;
}
