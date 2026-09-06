import { useMemo, useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { confirmPhrasesMatch } from "@shared/confirmPhrase";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";

const categories = ["Dúvida", "Erro", "Estabilidade", "Outro"] as const;
type InboxItem = {
  id: number;
  subject: string;
  body: string;
  category: string;
  status: string;
  pagePath: string | null;
  reply: string | null;
  createdAt: Date | string;
  repliedAt: Date | string | null;
  authorName: string;
  authorEmail: string | null;
};

function formatWhen(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR");
}

export default function CanalOjuAdmin() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const utils = trpc.useUtils();
  const pagePath = new URLSearchParams(window.location.search).get("de") || "";
  const [category, setCategory] = useState<(typeof categories)[number]>("Dúvida");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Record<number, string>>({});
  const [bucket, setBucket] = useState<"ativas" | "arquivadas">("ativas");
  const [deleteTarget, setDeleteTarget] = useState<InboxItem | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const mine = trpc.desk.mine.useQuery(undefined, { enabled: !principal });
  const inbox = trpc.desk.inbox.useQuery(undefined, { enabled: principal, refetchInterval: 20_000 });
  const refreshDesk = () => {
    utils.desk.mine.invalidate();
    utils.desk.inbox.invalidate();
    utils.operations.overview.invalidate();
  };
  const send = trpc.desk.send.useMutation({
    onSuccess: () => {
      toast.success("Enviado à Equipe Ojú no Canal Ojú.");
      setSubject("");
      setBody("");
      refreshDesk();
    },
    onError: error => toast.error(error.message),
  });
  const answer = trpc.desk.reply.useMutation({
    onSuccess: () => {
      toast.success("Resposta registrada. O admin vê no Canal Ojú.");
      refreshDesk();
    },
    onError: error => toast.error(error.message),
  });
  const archive = trpc.desk.archive.useMutation({
    onSuccess: () => { toast.success("Arquivada. Sai da caixa ativa."); refreshDesk(); },
    onError: error => toast.error(error.message),
  });
  const unarchive = trpc.desk.unarchive.useMutation({
    onSuccess: () => { toast.success("Voltou para a caixa ativa."); setBucket("ativas"); refreshDesk(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.desk.remove.useMutation({
    onSuccess: () => {
      toast.success("Excluída. Some para a Equipe Ojú e para quem enviou.");
      setDeleteTarget(null);
      setConfirmation("");
      refreshDesk();
    },
    onError: error => toast.error(error.message),
  });

  const inboxItems = (inbox.data || []) as InboxItem[];
  const activeCount = inboxItems.filter(item => item.status !== "Arquivada").length;
  const archivedCount = inboxItems.filter(item => item.status === "Arquivada").length;
  const visibleInbox = useMemo(
    () => inboxItems.filter(item => (bucket === "arquivadas" ? item.status === "Arquivada" : item.status !== "Arquivada")),
    [inboxItems, bucket],
  );

  function replyText(item: InboxItem) {
    return (reply[item.id] ?? item.reply ?? "").trim();
  }

  function sendReply(item: InboxItem, status: "Em atendimento" | "Resolvida") {
    const text = replyText(item);
    if (text.length < 4) {
      toast.error("Escreva a resposta (mínimo 4 caracteres).");
      return;
    }
    answer.mutate({ id: item.id, reply: text, status });
  }

  return (
    <AdminPage eyebrow="Canal Ojú" title={principal ? "Caixa da operação." : "Fale com a Equipe Ojú."}>
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-[#655e52]">
        {principal
          ? "Ojú Bot é só para criador parceiro. Aqui a Equipe Ojú lê, responde, arquiva ou exclui. Arquivar guarda a conversa. Excluir some para os dois lados, com confirmação do assunto."
          : "Ojú Bot, no canto da tela, responde primeiro com textos prontos. Se não achar, envie para a Equipe Ojú neste canal."}
      </p>
      {principal ? null : (
      <form
        className="admin-card mb-7 grid gap-4 p-5"
        onSubmit={event => {
          event.preventDefault();
          send.mutate({ category, subject, body, pagePath: pagePath || window.location.pathname });
        }}
      >
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Nova mensagem</p>
        <div className="flex flex-wrap gap-2">
          {categories.map(item => (
            <button type="button" key={item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${category === item ? "bg-[#242017] text-white" : "bg-[#eee9dc]"}`}>{item}</button>
          ))}
        </div>
        <label className="grid gap-2 text-sm font-medium">Assunto<Input required minLength={4} value={subject} onChange={event => setSubject(event.target.value)} placeholder="Ex.: não consigo publicar a história" /></label>
        <label className="grid gap-2 text-sm font-medium">O que aconteceu<Textarea required minLength={12} value={body} onChange={event => setBody(event.target.value)} placeholder="Descreva a tela, o que tentou e o que apareceu." /></label>
        {pagePath ? <p className="text-xs text-[#655e52]">Tela de origem: {pagePath}</p> : null}
        <div className="flex justify-end"><Button disabled={send.isPending} className="bg-[#242017] text-white">{send.isPending ? "Enviando..." : "Enviar à Equipe Ojú"}</Button></div>
      </form>
      )}

      {principal ? (
        <section className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Caixa da Equipe Ojú</p>
          <h2 className="mt-2 font-serif text-3xl">O que a equipe mandou</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setBucket("ativas")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${bucket === "ativas" ? "bg-[#242017] text-white" : "bg-[#eee9dc]"}`}>Ativas ({activeCount})</button>
            <button type="button" onClick={() => setBucket("arquivadas")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${bucket === "arquivadas" ? "bg-[#242017] text-white" : "bg-[#eee9dc]"}`}>Arquivadas ({archivedCount})</button>
          </div>
          {inbox.isLoading ? <p className="mt-4 text-sm">Carregando canal...</p> : visibleInbox.length ? (
            <div className="mt-4 grid gap-4">
              {visibleInbox.map(item => {
                const archived = item.status === "Arquivada";
                const busy = answer.isPending || archive.isPending || unarchive.isPending || remove.isPending;
                return (
                  <article key={item.id} className="admin-card grid gap-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.subject}</p>
                      <span className="rounded-full bg-[#eee9dc] px-2 py-1 text-[10px] font-bold uppercase">{item.status} · {item.category}</span>
                    </div>
                    <p className="text-xs text-[#655e52]">{item.authorName}{item.authorEmail ? ` · ${item.authorEmail}` : ""} · {formatWhen(item.createdAt)}{item.pagePath ? ` · ${item.pagePath}` : ""}</p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-[#655e52]">{item.body}</p>
                    {item.reply ? <p className="whitespace-pre-wrap rounded-xl bg-[#e8f0e4] p-3 text-sm text-[#2c683b]">Resposta{item.repliedAt ? ` · ${formatWhen(item.repliedAt)}` : ""}: {item.reply}</p> : null}
                    {archived ? (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => unarchive.mutate({ id: item.id })}><RotateCcw className="mr-1 h-3.5 w-3.5" />Desarquivar</Button>
                        <Button size="sm" variant="outline" className="border-[#8b4d24] text-[#8b4d24]" disabled={busy} onClick={() => { setDeleteTarget(item); setConfirmation(""); }}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <Textarea value={reply[item.id] ?? item.reply ?? ""} onChange={event => setReply(current => ({ ...current, [item.id]: event.target.value }))} placeholder="Resposta para o admin" />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => sendReply(item, "Em atendimento")}>Responder</Button>
                          <Button size="sm" className="bg-[#242017] text-white" disabled={busy} onClick={() => sendReply(item, "Resolvida")}>Marcar resolvida</Button>
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => archive.mutate({ id: item.id })}><Archive className="mr-1 h-3.5 w-3.5" />Arquivar</Button>
                          <Button size="sm" variant="outline" className="border-[#8b4d24] text-[#8b4d24]" disabled={busy} onClick={() => { setDeleteTarget(item); setConfirmation(""); }}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : <div className="mt-4"><EmptyAdmin text={bucket === "arquivadas" ? "Nenhuma mensagem arquivada." : "Nenhuma mensagem ativa no canal."} /></div>}
        </section>
      ) : null}

      {principal ? null : (
      <section>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Suas mensagens</p>
        {mine.data?.length ? (
          <div className="mt-4 grid gap-3">
            {mine.data.map(item => (
              <article key={item.id} className="rounded-2xl border border-[#242017]/10 bg-white p-4">
                <p className="font-medium">{item.subject}</p>
                <p className="mt-1 text-xs text-[#655e52]">{item.category} · {item.status} · {formatWhen(item.createdAt)}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#655e52]">{item.body}</p>
                {item.reply ? <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#e8f0e4] p-3 text-sm text-[#2c683b]">Equipe Ojú: {item.reply}</p> : <p className="mt-2 text-sm text-[#655e52]">{item.status === "Arquivada" ? "Arquivada pela Equipe Ojú." : "Aguardando resposta."}</p>}
              </article>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-[#655e52]">Você ainda não enviou nada neste canal.</p>}
      </section>
      )}

      {deleteTarget ? (
        <AlertDialog open onOpenChange={open => { if (!open && !remove.isPending) { setDeleteTarget(null); setConfirmation(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir esta mensagem?</AlertDialogTitle>
              <AlertDialogDescription>Some da caixa da Equipe Ojú e da lista de quem enviou. Não dá para restaurar. A auditoria registra o evento, não o texto.</AlertDialogDescription>
            </AlertDialogHeader>
            <label className="grid gap-2 text-sm font-medium">
              Digite o assunto para confirmar. Maiúsculas e acentos não impedem. <b>{deleteTarget.subject}</b>
              <Input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
              <Button type="button" disabled={!confirmPhrasesMatch(deleteTarget.subject, confirmation) || remove.isPending} className="bg-[#8b4d24] text-white hover:bg-[#723b1a]" onClick={() => remove.mutate({ id: deleteTarget.id, confirmation })}>{remove.isPending ? "Excluindo..." : "Excluir"}</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </AdminPage>
  );
}
