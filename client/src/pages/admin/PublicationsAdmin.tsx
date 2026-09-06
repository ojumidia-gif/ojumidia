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
const kindWhere: Record<(typeof kinds)[number], string> = {
  "História": "/historias",
  "Cobertura": "/coberturas",
  "Documentário": "/documentarios",
  "Projeto": "/projetos",
  "Fotografia documental": "/fotografia-documental",
};

export default function PublicationsAdmin() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const isPrincipal = user?.role === "administrador principal";
  const [page, setPage] = useState(0);
  const search = new URLSearchParams(window.location.search);
  const etapaFilter = search.get("etapa");
  const tipoFilter = search.get("tipo") as typeof kinds[number] | null;
  const mineOnly = search.get("carteira") === "meus";
  const { data, isLoading } = trpc.editorial.adminList.useQuery({
    limit: 40,
    offset: page * 40,
    status: etapaFilter && ["Rascunho", "Em revisão", "Aprovada", "Publicada", "Arquivada"].includes(etapaFilter) ? etapaFilter as "Rascunho" | "Em revisão" | "Aprovada" | "Publicada" | "Arquivada" : undefined,
    contentKind: tipoFilter && kinds.includes(tipoFilter) ? tipoFilter : undefined,
    createdByMe: mineOnly || undefined,
  }, { refetchInterval: 5000 });
  const rows = data?.items;
  const initialKind = tipoFilter;

  const [open, setOpen] = useState(() => search.get("novo") === "1" || Boolean(initialKind));
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<typeof kinds[number]>(initialKind && kinds.includes(initialKind) ? initialKind : "História");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string; version: number } | null>(null);
  const [deleteNote, setDeleteNote] = useState("");

  const create = trpc.editorial.create.useMutation({
    onSuccess: result => {
      toast.success("Aberto. Complete texto, território e capa.");
      setOpen(false); setTitle("");
      utils.editorial.adminList.invalidate();
      setLocation(`/admin/editar/${result.id}`);
    },
    onError: error => toast.error("Não foi possível criar.", { description: error.message }),
  });
  const advance = trpc.editorial.advanceStatus.useMutation({
    onSuccess: result => {
      const messages: Record<string, string> = {
        "Em revisão": "Enviado para revisão.",
        Aprovada: "Aprovado.",
        Publicada: "No portal.",
      };
      toast.success(messages[result.status] || "Etapa atualizada.");
      utils.editorial.adminList.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const unpublish = trpc.editorial.unpublish.useMutation({
    onSuccess: () => { toast.success("Fora do ar."); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const archive = trpc.editorial.archive.useMutation({
    onSuccess: () => { toast.success("Arquivado."); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const republish = trpc.editorial.republish.useMutation({
    onSuccess: () => { toast.success("De volta no portal."); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const restore = trpc.editorial.restore.useMutation({
    onSuccess: () => { toast.success("Restaurado."); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.editorial.delete.useMutation({
    onSuccess: () => { toast.success("Na lixeira."); setDeleteTarget(null); setDeleteNote(""); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const hrefWith = (next: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const tipo = next.tipo === undefined ? tipoFilter : next.tipo;
    const etapa = next.etapa === undefined ? etapaFilter : next.etapa;
    const carteira = next.carteira === undefined ? (mineOnly ? "meus" : null) : next.carteira;
    if (tipo) params.set("tipo", tipo);
    if (etapa) params.set("etapa", etapa);
    if (carteira) params.set("carteira", carteira);
    const query = params.toString();
    return query ? `/admin/publicacoes?${query}` : "/admin/publicacoes";
  };

  const actionButtons = (item: NonNullable<typeof data>["items"][number]) => {
    const next = nextEditorialAction(user?.role, item.status);
    return (
    <div className="flex flex-wrap gap-2">
      {!item.deletedAt && <>
        <Button asChild size="sm" className="bg-[#242017] text-white hover:bg-[#3a3428]">
          <Link href={`/admin/editar/${item.id}`}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Link>
        </Button>
        {next && (
          <Button size="sm" onClick={() => advance.mutate({ id: item.id, expectedVersion: item.version })} disabled={advance.isPending}>
            <Send className="mr-1 h-3 w-3" />{next.label}
          </Button>
        )}
        {item.status === "Publicada" && item.isPublic && <Button variant="outline" size="sm" onClick={() => unpublish.mutate({ id: item.id, expectedVersion: item.version })}>Tirar do ar</Button>}
        {item.status === "Publicada" && !item.isPublic && <Button variant="outline" size="sm" onClick={() => republish.mutate({ id: item.id, expectedVersion: item.version })}>Republicar</Button>}
        {item.status !== "Arquivada" && <Button variant="ghost" size="sm" onClick={() => archive.mutate({ id: item.id, expectedVersion: item.version })}><Archive className="mr-1 h-3.5 w-3.5" />Arquivar</Button>}
        <Button asChild size="sm" variant="ghost">
          <Link href={`/admin/preview/${item.id}`}><Eye className="mr-1 h-3.5 w-3.5" />Prévia</Link>
        </Button>
        {item.status === "Publicada" && item.isPublic && <Button asChild variant="ghost" size="icon" aria-label={`Ver ${item.title} no portal`}><Link href={`/historias/${item.slug}`}><Eye className="h-4 w-4" /></Link></Button>}
        {isPrincipal && <Button variant="outline" size="sm" className="border-[#8b4d24] text-[#8b4d24]" onClick={() => setDeleteTarget({ id: item.id, title: item.title, version: item.version })}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button>}
      </>}
      {item.deletedAt && isPrincipal && <Button variant="outline" size="sm" onClick={() => restore.mutate({ id: item.id, expectedVersion: item.version })}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restaurar</Button>}
    </div>
    );
  };

  return <AdminPage eyebrow="Conteúdos" title="Criar e publicar." action={<Button onClick={() => setOpen(true)} className="rounded-full bg-[#f6b71b] text-[#242017] hover:bg-[#eeb12a]"><FilePlus2 className="mr-2 h-4 w-4" />Novo</Button>}>
    <p className="-mt-4 mb-4 text-sm text-[#655e52]">Tipo + título. Depois texto, território e capa. Admin publica no site; a Home é outra tela.</p>
    <div className="mb-4 flex flex-wrap gap-2 text-sm font-semibold">
      <Link href={hrefWith({ tipo: null })} className={`rounded-full px-3 py-1.5 ${!tipoFilter ? "bg-[#242017] text-white" : "bg-[#eee9dc]"}`}>Tudo</Link>
      {kinds.map(item => (
        <Link key={item} href={hrefWith({ tipo: item })} className={`rounded-full px-3 py-1.5 ${tipoFilter === item ? "bg-[#242017] text-white" : "bg-[#eee9dc]"}`}>{item}</Link>
      ))}
      <Link href={hrefWith({ carteira: mineOnly ? null : "meus" })} className={`rounded-full px-3 py-1.5 ${mineOnly ? "bg-[#242017] text-white" : "bg-[#eee9dc]"}`}>{mineOnly ? "Só os meus" : "Mesa"}</Link>
    </div>
    {open && <section className="admin-card mb-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#242017]/10 px-5 py-3"><p className="font-semibold">Novo no portal</p><button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-[#eee9dc]" aria-label="Fechar"><X className="h-4 w-4" /></button></div>
      <form onSubmit={event => { event.preventDefault(); create.mutate({ title, contentKind: kind, teamCredit: "Equipe Ojú" }); }} className="grid gap-4 p-5">
        <div className="flex flex-wrap gap-2">
          {kinds.map(item => (
            <button type="button" key={item} onClick={() => setKind(item)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${kind === item ? "bg-[#242017] text-white" : "bg-[#eee9dc]"}`}>{item}</button>
          ))}
        </div>
        <p className="text-xs text-[#655e52]">Vai para {kindWhere[kind]}.</p>
        <label className="grid gap-2 text-sm font-medium">Título<Input required minLength={4} autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Nome no portal" /></label>
        <div className="flex justify-end"><Button disabled={create.isPending} className="bg-[#242017] text-white">{create.isPending ? "Abrindo..." : "Começar"}</Button></div>
      </form>
    </section>}

    <div className="admin-card overflow-hidden">
      {etapaFilter ? <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242017]/10 px-6 py-3 text-sm"><p>Etapa: <strong>{etapaFilter}</strong></p><Link href={hrefWith({ etapa: null })} className="font-semibold">Limpar</Link></div> : null}
      {isLoading ? <div className="p-8 text-sm text-[#655e52]">Carregando...</div> : rows?.length ? <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[940px] text-left"><thead className="bg-[#eee9dc] text-[11px] uppercase tracking-[.13em] text-[#655e52]"><tr><th className="px-6 py-3">Conteúdo</th><th className="px-4 py-3">Portal</th><th className="px-4 py-3">Quem</th><th className="px-4 py-3">Situação</th><th className="px-6 py-3 text-right">Ações</th></tr></thead><tbody>{rows.map(item => <tr key={item.id} className={`border-t border-[#242017]/8 ${item.deletedAt ? "bg-[#f5e5de]/60" : ""}`}><td className="px-6 py-4"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-[#655e52]">{item.contentKind}{(item.manualFeatured || item.homePlacement !== "Nenhum") ? " · Home" : item.status === "Publicada" ? " · no site" : ""}</p></td><td className="px-4 py-4 text-sm text-[#655e52]">{kindWhere[item.contentKind as typeof kinds[number]] || item.contentKind}</td><td className="px-4 py-4 text-sm text-[#655e52]">{item.createdByName}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span>{item.deletedAt ? <span className="ml-2 text-xs text-[#8b4d24]">lixeira</span> : item.status === "Publicada" && !item.isPublic ? <span className="ml-2 text-xs text-[#8b4d24]">fora do ar</span> : null}</td><td className="px-6 py-4"><div className="flex justify-end">{actionButtons(item)}</div></td></tr>)}</tbody></table></div>
        <div className="grid gap-3 p-3 md:hidden">{rows.map(item => <article key={item.id} className={`rounded-xl border border-[#242017]/10 p-4 ${item.deletedAt ? "bg-[#f5e5de]/60" : "bg-white/35"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-[#655e52]">{item.contentKind} · {item.createdByName}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span></div><div className="mt-4 border-t border-[#242017]/10 pt-4">{actionButtons(item)}</div></article>)}</div>
      </> : <div className="p-6"><EmptyAdmin text="Nada aqui. Clique em Novo." /></div>}
      {data && (data.hasMore || page > 0) ? <div className="flex justify-end gap-2 border-t border-[#242017]/10 px-6 py-3"><button className="text-sm font-semibold" disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))}>Anterior</button><button className="text-sm font-semibold" disabled={!data.hasMore} onClick={() => setPage(current => current + 1)}>Próxima</button></div> : null}
    </div>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={dialogOpen => { if (!dialogOpen) { setDeleteTarget(null); setDeleteNote(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Enviar para a lixeira?</AlertDialogTitle><AlertDialogDescription>“{deleteTarget?.title}” sai do portal.</AlertDialogDescription></AlertDialogHeader><label className="grid gap-2 text-sm font-medium">Motivo<Textarea value={deleteNote} onChange={event => setDeleteNote(event.target.value)} /></label><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={!deleteTarget || deleteNote.trim().length < 3 || remove.isPending} className="bg-[#8b4d24] text-white hover:bg-[#723b1a]" onClick={event => { event.preventDefault(); if (deleteTarget) remove.mutate({ id: deleteTarget.id, expectedVersion: deleteTarget.version, note: deleteNote.trim() }); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AdminPage>;
}
