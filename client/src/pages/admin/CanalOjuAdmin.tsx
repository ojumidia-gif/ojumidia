import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";

const categories = ["Dúvida", "Erro", "Estabilidade", "Outro"] as const;

export default function CanalOjuAdmin() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const utils = trpc.useUtils();
  const pagePath = new URLSearchParams(window.location.search).get("de") || "";
  const [category, setCategory] = useState<(typeof categories)[number]>("Dúvida");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Record<number, string>>({});
  const mine = trpc.desk.mine.useQuery(undefined, { enabled: !principal });
  const inbox = trpc.desk.inbox.useQuery(undefined, { enabled: principal, refetchInterval: 20_000 });
  const send = trpc.desk.send.useMutation({
    onSuccess: () => {
      toast.success("Enviado ao Super Admin no Canal Ojú.");
      setSubject("");
      setBody("");
      utils.desk.mine.invalidate();
      utils.desk.inbox.invalidate();
      utils.operations.overview.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const answer = trpc.desk.reply.useMutation({
    onSuccess: () => {
      toast.success("Resposta registrada. O admin vê no Canal Ojú.");
      utils.desk.inbox.invalidate();
      utils.operations.overview.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <AdminPage eyebrow="Canal Ojú" title={principal ? "Caixa da operação." : "Fale com o Super Admin."}>
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-[#655e52]">
        {principal
          ? "Ojú Bot é só para admin comum e usuário novo. Aqui vocês recebem dúvida, erro, código e sugestão — e respondem."
          : "Ojú Bot, no canto da tela, responde primeiro com textos prontos. Se não achar, envie para o Super Admin neste canal."}
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
        <div className="flex justify-end"><Button disabled={send.isPending} className="bg-[#242017] text-white">{send.isPending ? "Enviando..." : "Enviar ao Super Admin"}</Button></div>
      </form>
      )}

      {principal ? (
        <section className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Caixa do Super Admin</p>
          <h2 className="mt-2 font-serif text-3xl">O que a equipe mandou</h2>
          {inbox.isLoading ? <p className="mt-4 text-sm">Carregando canal...</p> : inbox.data?.length ? (
            <div className="mt-4 grid gap-4">
              {inbox.data.map(item => (
                <article key={item.id} className="admin-card grid gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{item.subject}</p>
                    <span className="rounded-full bg-[#eee9dc] px-2 py-1 text-[10px] font-bold uppercase">{item.status} · {item.category}</span>
                  </div>
                  <p className="text-xs text-[#655e52]">{item.authorName}{item.authorEmail ? ` · ${item.authorEmail}` : ""}{item.pagePath ? ` · ${item.pagePath}` : ""}</p>
                  <p className="text-sm leading-6 text-[#655e52]">{item.body}</p>
                  {item.reply ? <p className="rounded-xl bg-[#e8f0e4] p-3 text-sm text-[#2c683b]">Resposta: {item.reply}</p> : null}
                  {item.status !== "Resolvida" ? (
                    <div className="grid gap-2">
                      <Textarea value={reply[item.id] ?? item.reply ?? ""} onChange={event => setReply(current => ({ ...current, [item.id]: event.target.value }))} placeholder="Resposta para o admin" />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={answer.isPending} onClick={() => answer.mutate({ id: item.id, reply: (reply[item.id] ?? item.reply ?? "").trim(), status: "Em atendimento" })}>Responder</Button>
                        <Button size="sm" className="bg-[#242017] text-white" disabled={answer.isPending} onClick={() => answer.mutate({ id: item.id, reply: (reply[item.id] ?? item.reply ?? "Resolvido.").trim(), status: "Resolvida" })}>Marcar resolvida</Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : <div className="mt-4"><EmptyAdmin text="Nenhuma mensagem no canal ainda." /></div>}
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
                <p className="mt-1 text-xs text-[#655e52]">{item.category} · {item.status}</p>
                {item.reply ? <p className="mt-3 rounded-xl bg-[#e8f0e4] p-3 text-sm text-[#2c683b]">Super Admin: {item.reply}</p> : <p className="mt-2 text-sm text-[#655e52]">Aguardando resposta.</p>}
              </article>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-[#655e52]">Você ainda não enviou nada neste canal.</p>}
      </section>
      )}
    </AdminPage>
  );
}
