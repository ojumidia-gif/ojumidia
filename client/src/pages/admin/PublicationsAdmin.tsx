import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
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
const nextAction: Record<string, string> = {
  "Rascunho": "Enviar para revisão",
  "Em revisão": "Aprovar conteúdo",
  "Aprovada": "Publicar no portal",
  "Publicada": "Arquivar conteúdo",
  "Arquivada": "Registro preservado no acervo",
};
const statusFeedback: Record<string, { title: string; description: string }> = {
  "Rascunho": { title: "Conteúdo enviado para revisão.", description: "A equipe de edição já pode analisar este rascunho." },
  "Em revisão": { title: "Conteúdo aprovado.", description: "Ele está pronto para a decisão de publicação." },
  "Aprovada": { title: "Conteúdo publicado no portal.", description: "A atualização será refletida na experiência pública." },
  "Publicada": { title: "Conteúdo arquivado.", description: "Ele foi retirado do fluxo público e permanece preservado no acervo." },
};

export default function PublicationsAdmin() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const isPrincipal = user?.role === "administrador principal";
  const { data, isLoading } = trpc.editorial.adminList.useQuery(undefined, { refetchInterval: 5000 });
  const initialKind = new URLSearchParams(window.location.search).get("tipo") as typeof kinds[number] | null;
  const [open, setOpen] = useState(Boolean(initialKind));
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<typeof kinds[number]>(initialKind && kinds.includes(initialKind) ? initialKind : "História");
  const [summary, setSummary] = useState("");
  const [teamCredit, setTeamCredit] = useState("");
  const [photoLimit, setPhotoLimit] = useState("");
  const [videoLimit, setVideoLimit] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string; version: number } | null>(null);
  const [deleteNote, setDeleteNote] = useState("");

  const create = trpc.editorial.create.useMutation({
    onSuccess: result => {
      toast.success(kind === "Fotografia documental" ? "Coleção criada." : "Rascunho criado.", {
        description: kind === "Fotografia documental"
          ? "Agora adicione até cinco fotografias documentais, cada uma com seu próprio contexto."
          : "Você será levado à edição para incluir textos, fotos e vídeos dentro dos limites documentais.",
      });
      setOpen(false); setTitle(""); setSummary(""); setTeamCredit(""); setPhotoLimit(""); setVideoLimit("");
      utils.editorial.adminList.invalidate();
      setLocation(`/admin/editar/${result.id}`);
    },
    onError: error => toast.error("Não foi possível criar o rascunho.", { description: error.message }),
  });
  const advance = trpc.editorial.advanceStatus.useMutation({
    onSuccess: (_result, variables) => {
      const currentStatus = data?.find(item => item.id === variables.id)?.status || "";
      const feedback = statusFeedback[currentStatus];
      toast.success(feedback?.title || "Status editorial atualizado.", { description: feedback?.description });
      utils.editorial.adminList.invalidate();
    },
    onError: error => toast.error("Não foi possível atualizar a etapa editorial.", { description: error.message }),
  });
  const unpublish = trpc.editorial.unpublish.useMutation({
    onSuccess: () => { toast.success("Conteúdo retirado do portal.", { description: "O registro continua preservado no acervo e pode ser revisado pela equipe." }); utils.editorial.adminList.invalidate(); },
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
    onSuccess: () => { toast.success("Conteúdo restaurado para o Acervo privado."); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.editorial.delete.useMutation({
    onSuccess: () => { toast.success("Conteúdo removido do portal e enviado à lixeira editorial."); setDeleteTarget(null); setDeleteNote(""); utils.editorial.adminList.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const actionButtons = (item: NonNullable<typeof data>[number]) => (
    <div className="flex flex-wrap gap-2">
      {!item.deletedAt && <>
        <Button asChild variant="outline" size="sm" className={item.status === "Publicada" ? "border-[#806817] text-[#806817]" : ""}>
          <Link href={`/admin/editar/${item.id}`}><Pencil className="mr-1 h-3.5 w-3.5" />{item.status === "Publicada" ? "Revisar e editar" : "Editar"}</Link>
        </Button>
        <Button asChild variant="ghost" size="icon" aria-label={`Pré-visualizar ${item.title}`}><Link href={`/admin/preview/${item.id}`}><Eye className="h-4 w-4" /></Link></Button>
        {item.status === "Publicada" && item.isPublic && <Button variant="outline" size="sm" onClick={() => unpublish.mutate({ id: item.id, expectedVersion: item.version })}>Despublicar</Button>}
        {item.status === "Publicada" && !item.isPublic && <Button variant="outline" size="sm" onClick={() => republish.mutate({ id: item.id, expectedVersion: item.version })}>Republicar</Button>}
        {item.status !== "Arquivada" && <Button variant="outline" size="sm" onClick={() => archive.mutate({ id: item.id, expectedVersion: item.version })}><Archive className="mr-1 h-3.5 w-3.5" />Arquivar</Button>}
        {item.status !== "Arquivada" && <Button size="sm" onClick={() => advance.mutate({ id: item.id, expectedVersion: item.version })} disabled={advance.isPending}>{nextAction[item.status]} <Send className="ml-1 h-3 w-3" /></Button>}
        {item.status === "Publicada" && item.isPublic && <Button asChild variant="ghost" size="icon" aria-label={`Ver ${item.title} no portal`}><Link href={`/historias/${item.slug}`}><Eye className="h-4 w-4" /></Link></Button>}
        {isPrincipal && <Button variant="outline" size="sm" className="border-[#8b4d24] text-[#8b4d24]" onClick={() => setDeleteTarget({ id: item.id, title: item.title, version: item.version })}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button>}
      </>}
      {item.deletedAt && isPrincipal && <Button variant="outline" size="sm" onClick={() => restore.mutate({ id: item.id, expectedVersion: item.version })}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restaurar</Button>}
    </div>
  );

  return <AdminPage eyebrow="Conteúdos" title="Criar, revisar e publicar." action={<Button onClick={() => setOpen(true)} className="rounded-full bg-[#f6b71b] text-[#242017] hover:bg-[#eeb12a]"><FilePlus2 className="mr-2 h-4 w-4" />Novo conteúdo</Button>}>
    {open && <section className="admin-card mb-7 overflow-hidden"><div className="flex items-center justify-between border-b border-[#242017]/10 px-6 py-4"><p className="font-serif text-2xl">Novo conteúdo</p><button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-[#eee9dc]" aria-label="Fechar criação de conteúdo"><X className="h-4 w-4" /></button></div><form onSubmit={event => { event.preventDefault(); create.mutate({ title, contentKind: kind, summary: summary || undefined, teamCredit: teamCredit || undefined, photoLimit: kind === "Fotografia documental" ? 5 : Number(photoLimit), videoLimit: kind === "Fotografia documental" ? 0 : Number(videoLimit) }); }} className="grid gap-4 p-6 md:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Tipo de conteúdo<select value={kind} onChange={event => setKind(event.target.value as typeof kind)} className="h-10 rounded-md border bg-white px-3">{kinds.map(item => <option key={item}>{item}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Crédito ou equipe responsável<Input required value={teamCredit} onChange={event => setTeamCredit(event.target.value)} placeholder="Ex.: Equipe Ojú · Fotografia: Nome · Cobertura documental" /><span className="text-xs font-normal text-[#655e52]">Use este campo para identificar a equipe, fotógrafo, videomaker ou responsável editorial.</span></label><label className="grid gap-2 text-sm font-medium md:col-span-2">Título<Input required minLength={4} value={title} onChange={event => setTitle(event.target.value)} placeholder="Dê um título ao material" /></label><label className="grid gap-2 text-sm font-medium md:col-span-2">Descrição inicial<Textarea value={summary} onChange={event => setSummary(event.target.value)} placeholder="Uma breve apresentação para orientar o trabalho editorial." /></label>{kind === "Fotografia documental" ? <p className="rounded-xl bg-[#fff7dc] p-3 text-sm text-[#655e52] md:col-span-2"><strong>Regra documental:</strong> esta coleção aceita até cinco fotos e nenhum vídeo. Cada fotografia terá título, data, local e biografia viva próprios na próxima etapa.</p> : <><label className="grid gap-2 text-sm font-medium">Limite de fotografias<Input required min="0" max="200" type="number" value={photoLimit} onChange={event => setPhotoLimit(event.target.value)} placeholder="Ex.: 20" /></label><label className="grid gap-2 text-sm font-medium">Limite de vídeos <Input required min="0" max="80" type="number" value={videoLimit} onChange={event => setVideoLimit(event.target.value)} placeholder="Ex.: 3" /></label><p className="text-xs leading-5 text-[#655e52] md:col-span-2">A definição é documental, não de portfólio: ela organiza o escopo de Histórias, Coberturas, Documentários e Projetos — inclusive quando a publicação estiver relacionada à taxonomia Evento — antes de qualquer upload.</p></>}<div className="flex justify-end md:col-span-2"><Button disabled={create.isPending || !teamCredit.trim() || (kind !== "Fotografia documental" && (!photoLimit || !videoLimit))} className="bg-[#242017] text-white">{create.isPending ? "Salvando..." : "Criar rascunho e adicionar materiais"}</Button></div></form></section>}

    <div className="admin-card overflow-hidden">
      {isLoading ? <div className="p-8 text-sm text-[#655e52]">Carregando operação editorial...</div> : data?.length ? <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[940px] text-left"><thead className="bg-[#eee9dc] text-[11px] uppercase tracking-[.13em] text-[#655e52]"><tr><th className="px-6 py-3">Conteúdo</th><th className="px-4 py-3">Etapa</th><th className="px-4 py-3">Próximo passo</th><th className="px-6 py-3 text-right">Ações</th></tr></thead><tbody>{data.map(item => <tr key={item.id} className={`border-t border-[#242017]/8 ${item.deletedAt ? "bg-[#f5e5de]/60" : ""}`}><td className="px-6 py-4"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-[#655e52]">{item.contentKind}</p></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span>{item.deletedAt ? <span className="ml-2 text-xs text-[#8b4d24]">na lixeira</span> : item.status === "Publicada" && !item.isPublic ? <span className="ml-2 text-xs text-[#8b4d24]">despublicada</span> : null}</td><td className="px-4 py-4 text-sm text-[#655e52]">{item.deletedAt ? "Aguardando restauração ou exclusão definitiva futura" : nextAction[item.status] || "Fluxo concluído"}</td><td className="px-6 py-4"><div className="flex justify-end">{actionButtons(item)}</div></td></tr>)}</tbody></table></div>
        <div className="grid gap-3 p-3 md:hidden">{data.map(item => <article key={item.id} className={`rounded-xl border border-[#242017]/10 p-4 ${item.deletedAt ? "bg-[#f5e5de]/60" : "bg-white/35"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-[#655e52]">{item.contentKind}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span></div>{item.deletedAt ? <p className="mt-3 text-xs text-[#8b4d24]">Na lixeira editorial. Somente o Super Admin pode restaurar.</p> : <p className="mt-3 text-xs text-[#655e52]">Próximo passo: {nextAction[item.status] || "Fluxo concluído"}{item.status === "Publicada" && !item.isPublic ? " · despublicada" : ""}</p>}<div className="mt-4 border-t border-[#242017]/10 pt-4">{actionButtons(item)}</div></article>)}</div>
      </> : <div className="p-6"><EmptyAdmin text="Ainda não há conteúdos. Crie uma História, Cobertura, Documentário ou Projeto para iniciar o ciclo editorial." /></div>}
    </div>
    <p className="mt-4 text-xs text-[#655e52]">Cada conteúdo pode ser pré-visualizado, editado, despublicado ou arquivado. O Super Admin também pode excluir logicamente e restaurar registros, sem apagar mídia, direitos ou histórico editorial.</p>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={dialogOpen => { if (!dialogOpen) { setDeleteTarget(null); setDeleteNote(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Enviar conteúdo para a lixeira editorial?</AlertDialogTitle><AlertDialogDescription>“{deleteTarget?.title}” sairá imediatamente do portal público. Mídias, direitos e histórico serão preservados; somente o Super Admin poderá restaurá-lo.</AlertDialogDescription></AlertDialogHeader><label className="grid gap-2 text-sm font-medium">Motivo da exclusão<Textarea value={deleteNote} onChange={event => setDeleteNote(event.target.value)} placeholder="Ex.: publicação substituída, autorização revogada ou correção editorial." /></label><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={!deleteTarget || deleteNote.trim().length < 3 || remove.isPending} className="bg-[#8b4d24] text-white hover:bg-[#723b1a]" onClick={event => { event.preventDefault(); if (deleteTarget) remove.mutate({ id: deleteTarget.id, expectedVersion: deleteTarget.version, note: deleteNote.trim() }); }}>Excluir do portal</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AdminPage>;
}
