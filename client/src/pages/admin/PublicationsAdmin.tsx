import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { nextEditorialAction } from "@/lib/editorialFlow";
import { Archive, Eye, FilePlus2, Pencil, RotateCcw, Send, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { siteDestinations } from "@/lib/siteDestinations";
import { AdminPage, EmptyAdmin, statusStyle } from "./_shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const kinds = ["História", "Cobertura", "Documentário", "Projeto", "Fotografia documental"] as const;
const kindGuide: Record<(typeof kinds)[number], { where: string; hint: string }> = {
  "História": { where: "Portal → Histórias", hint: "Narrativa editada com texto, fotos e até 2 vídeos curtos." },
  "Cobertura": { where: "Portal → Coberturas", hint: "Registro de festa, culto, encontro ou celebração." },
  "Documentário": { where: "Portal → Documentários", hint: "Filme ou série documental publicada pela Ojú." },
  "Projeto": { where: "Portal → Projetos", hint: "Iniciativa de médio prazo com memória e contexto." },
  "Fotografia documental": { where: "Portal → Acervo / coleções", hint: "Até 5 fotos, cada uma com título, data, local e biografia." },
};

export default function PublicationsAdmin() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const isPrincipal = user?.role === "administrador principal";
  const [page, setPage] = useState(0);
  const etapaFilter = new URLSearchParams(window.location.search).get("etapa");
  const { data, isLoading } = trpc.editorial.adminList.useQuery({
    limit: 40,
    offset: page * 40,
    status: etapaFilter && ["Rascunho", "Em revisão", "Aprovada", "Publicada", "Arquivada"].includes(etapaFilter) ? etapaFilter as "Rascunho" | "Em revisão" | "Aprovada" | "Publicada" | "Arquivada" : undefined,
  }, { refetchInterval: 5000 });
  const rows = data?.items;
  const initialKind = new URLSearchParams(window.location.search).get("tipo") as typeof kinds[number] | null;
  const [open, setOpen] = useState(Boolean(initialKind));
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<typeof kinds[number]>(initialKind && kinds.includes(initialKind) ? initialKind : "História");
  const [summary, setSummary] = useState("");
  const [teamCredit, setTeamCredit] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string; version: number } | null>(null);
  const [deleteNote, setDeleteNote] = useState("");

  const create = trpc.editorial.create.useMutation({
    onSuccess: result => {
      toast.success("Rascunho criado.", { description: `Este ${kind.toLowerCase()} vai para ${kindGuide[kind].where}. Complete o texto e as fotos, depois envie para revisão.` });
      setOpen(false); setTitle(""); setSummary(""); setTeamCredit("");
      utils.editorial.adminList.invalidate();
      setLocation(`/admin/editar/${result.id}`);
    },
    onError: error => toast.error("Não foi possível criar o rascunho.", { description: error.message }),
  });
  const advance = trpc.editorial.advanceStatus.useMutation({
    onSuccess: result => {
      const messages: Record<string, string> = {
        "Em revisão": "Enviado para revisão.",
        Aprovada: "Aprovado. Próximo passo: publicar no site.",
        Publicada: "Publicado no portal.",
      };
      toast.success(messages[result.status] || "Etapa atualizada.");
      utils.editorial.adminList.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const unpublish = trpc.editorial.unpublish.useMutation({
    onSuccess: () => { toast.success("Conteúdo retirado do portal."); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error("Não foi possível retirar o conteúdo do portal.", { description: error.message }),
  });
  const archive = trpc.editorial.archive.useMutation({
    onSuccess: () => { toast.success("Conteúdo arquivado e retirado do portal."); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const republish = trpc.editorial.republish.useMutation({
    onSuccess: () => { toast.success("Conteúdo republicado no portal."); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const restore = trpc.editorial.restore.useMutation({
    onSuccess: () => { toast.success("Conteúdo restaurado."); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.editorial.delete.useMutation({
    onSuccess: () => { toast.success("Conteúdo enviado à lixeira editorial."); setDeleteTarget(null); setDeleteNote(""); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const actionButtons = (item: NonNullable<typeof data>["items"][number]) => {
    const next = nextEditorialAction(user?.role, item.status);
    return (
    <div className="flex flex-wrap gap-2">
      {!item.deletedAt && <>
        <Button asChild size="sm" className="bg-[#242017] text-white hover:bg-[#3a3428]">
          <Link href={`/admin/editar/${item.id}`}><Pencil className="mr-1 h-3.5 w-3.5" />Continuar</Link>
        </Button>
        {next && (
          <Button size="sm" onClick={() => advance.mutate({ id: item.id, expectedVersion: item.version })} disabled={advance.isPending}>
            <Send className="mr-1 h-3 w-3" />{next.label}
          </Button>
        )}
        {item.status === "Publicada" && item.isPublic && <Button variant="outline" size="sm" onClick={() => unpublish.mutate({ id: item.id, expectedVersion: item.version })}>Tirar do ar</Button>}
        {item.status === "Publicada" && !item.isPublic && <Button variant="outline" size="sm" onClick={() => republish.mutate({ id: item.id, expectedVersion: item.version })}>Republicar</Button>}
        {item.status !== "Arquivada" && <Button variant="outline" size="sm" onClick={() => archive.mutate({ id: item.id, expectedVersion: item.version })}><Archive className="mr-1 h-3.5 w-3.5" />Arquivar</Button>}
        {item.status === "Publicada" && item.isPublic && <Button asChild variant="ghost" size="icon" aria-label={`Ver ${item.title} no portal`}><Link href={`/historias/${item.slug}`}><Eye className="h-4 w-4" /></Link></Button>}
        {isPrincipal && <Button variant="outline" size="sm" className="border-[#8b4d24] text-[#8b4d24]" onClick={() => setDeleteTarget({ id: item.id, title: item.title, version: item.version })}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button>}
      </>}
      {item.deletedAt && isPrincipal && <Button variant="outline" size="sm" onClick={() => restore.mutate({ id: item.id, expectedVersion: item.version })}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restaurar</Button>}
    </div>
    );
  };

  return <AdminPage eyebrow="Conteúdos" title="Criar e publicar em poucos passos." action={<Button onClick={() => setOpen(true)} className="rounded-full bg-[#f6b71b] text-[#242017] hover:bg-[#eeb12a]"><FilePlus2 className="mr-2 h-4 w-4" />Novo conteúdo</Button>}>
    <section className="mb-7">
      <p className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-[#806817]">As dez seções do site</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {siteDestinations.map(dest => dest.action === "editorial" ? (
          <button type="button" key={dest.id} onClick={() => { if (dest.contentKind) setKind(dest.contentKind); setOpen(true); }} className="rounded-2xl border border-[#242017]/10 bg-white p-4 text-left hover:border-[#806817]">
            <p className="font-semibold">{dest.label}</p>
            <p className="mt-2 text-xs leading-5 text-[#655e52]">{dest.how}</p>
          </button>
        ) : (
          <Link key={dest.id} href={dest.adminHref} className="rounded-2xl border border-[#242017]/10 bg-white p-4 hover:border-[#806817]">
            <p className="font-semibold">{dest.label}</p>
            <p className="mt-2 text-xs leading-5 text-[#655e52]">{dest.how}</p>
          </Link>
        ))}
      </div>
    </section>
    {open && <section className="admin-card mb-7 overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#242017]/10 px-6 py-4"><p className="font-serif text-2xl">O que você vai publicar?</p><button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-[#eee9dc]" aria-label="Fechar criação de conteúdo"><X className="h-4 w-4" /></button></div>
      <form onSubmit={event => { event.preventDefault(); create.mutate({ title, contentKind: kind, summary: summary || undefined, teamCredit: teamCredit || undefined }); }} className="grid gap-5 p-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {kinds.map(item => (
            <button type="button" key={item} onClick={() => setKind(item)} className={`rounded-2xl border p-4 text-left ${kind === item ? "border-[#806817] bg-[#fff7dc]" : "border-[#242017]/10 bg-white"}`}>
              <p className="font-semibold">{item}</p>
              <p className="mt-1 text-xs text-[#655e52]">{kindGuide[item].where}</p>
              <p className="mt-2 text-xs leading-5 text-[#655e52]">{kindGuide[item].hint}</p>
            </button>
          ))}
        </div>
        <p className="rounded-xl bg-[#f7f3e9] px-4 py-3 text-sm text-[#655e52]">Destino: <strong>{kindGuide[kind].where}</strong>. Depois: texto e fotos → revisão → aprovação → publicar no site.</p>
        <label className="grid gap-2 text-sm font-medium">Título<Input required minLength={4} value={title} onChange={event => setTitle(event.target.value)} placeholder="Nome que aparece no portal" /></label>
        <label className="grid gap-2 text-sm font-medium">Quem fez / crédito <span className="font-normal text-[#655e52]">(pode completar depois)</span><Input value={teamCredit} onChange={event => setTeamCredit(event.target.value)} placeholder="Ex.: Equipe Ojú · Fotografia: Nome" /></label>
        <label className="grid gap-2 text-sm font-medium">Resumo (opcional)<Textarea value={summary} onChange={event => setSummary(event.target.value)} placeholder="Uma frase para a equipe e para o portal." /></label>
        <div className="flex justify-end"><Button disabled={create.isPending} className="bg-[#242017] text-white">{create.isPending ? "Criando..." : "Abrir o rascunho"}</Button></div>
      </form>
    </section>}

    <div className="admin-card overflow-hidden">
      {etapaFilter ? <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242017]/10 px-6 py-3 text-sm"><p>Filtro: <strong>{etapaFilter}</strong></p><Link href="/admin/publicacoes" className="font-semibold">Ver todos</Link></div> : null}
      {isLoading ? <div className="p-8 text-sm text-[#655e52]">Carregando conteúdos...</div> : rows?.length ? <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[940px] text-left"><thead className="bg-[#eee9dc] text-[11px] uppercase tracking-[.13em] text-[#655e52]"><tr><th className="px-6 py-3">Conteúdo</th><th className="px-4 py-3">Onde vai</th><th className="px-4 py-3">Situação</th><th className="px-6 py-3 text-right">Ações</th></tr></thead><tbody>{rows.map(item => <tr key={item.id} className={`border-t border-[#242017]/8 ${item.deletedAt ? "bg-[#f5e5de]/60" : ""}`}><td className="px-6 py-4"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-[#655e52]">{item.contentKind}</p></td><td className="px-4 py-4 text-sm text-[#655e52]">{kindGuide[item.contentKind as typeof kinds[number]]?.where || item.contentKind}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span>{item.deletedAt ? <span className="ml-2 text-xs text-[#8b4d24]">na lixeira</span> : item.status === "Publicada" && !item.isPublic ? <span className="ml-2 text-xs text-[#8b4d24]">fora do ar</span> : null}</td><td className="px-6 py-4"><div className="flex justify-end">{actionButtons(item)}</div></td></tr>)}</tbody></table></div>
        <div className="grid gap-3 p-3 md:hidden">{rows.map(item => <article key={item.id} className={`rounded-xl border border-[#242017]/10 p-4 ${item.deletedAt ? "bg-[#f5e5de]/60" : "bg-white/35"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-[#655e52]">{item.contentKind} · {kindGuide[item.contentKind as typeof kinds[number]]?.where}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span></div><div className="mt-4 border-t border-[#242017]/10 pt-4">{actionButtons(item)}</div></article>)}</div>
      </> : <div className="p-6"><EmptyAdmin text="Ainda não há conteúdos. Escolha o tipo, dê um título e publique." /></div>}
      {data && (data.hasMore || page > 0) ? <div className="flex justify-end gap-2 border-t border-[#242017]/10 px-6 py-3"><button className="text-sm font-semibold" disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))}>Anterior</button><button className="text-sm font-semibold" disabled={!data.hasMore} onClick={() => setPage(current => current + 1)}>Próxima</button></div> : null}
    </div>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={dialogOpen => { if (!dialogOpen) { setDeleteTarget(null); setDeleteNote(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Enviar conteúdo para a lixeira editorial?</AlertDialogTitle><AlertDialogDescription>“{deleteTarget?.title}” sai do portal. Mídias e histórico ficam preservados.</AlertDialogDescription></AlertDialogHeader><label className="grid gap-2 text-sm font-medium">Motivo da exclusão<Textarea value={deleteNote} onChange={event => setDeleteNote(event.target.value)} /></label><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={!deleteTarget || deleteNote.trim().length < 3 || remove.isPending} className="bg-[#8b4d24] text-white hover:bg-[#723b1a]" onClick={event => { event.preventDefault(); if (deleteTarget) remove.mutate({ id: deleteTarget.id, expectedVersion: deleteTarget.version, note: deleteNote.trim() }); }}>Excluir do portal</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AdminPage>;
}
