import { MessageCircle, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { makeDeskErrorCode, matchOjuBotFaqs, type OjuBotFaq } from "@/lib/ojuBotFaqs";
import { trpc } from "@/lib/trpc";

const categories = ["Dúvida", "Erro", "Estabilidade", "Outro"] as const;

export function OjuBot() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<OjuBotFaq | null>(null);
  const [ticket, setTicket] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]>("Dúvida");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const send = trpc.desk.send.useMutation({
    onSuccess: () => {
      toast.success("Enviado ao Canal Ojú da Equipe Ojú.");
      setTicket(false);
      setSubject("");
      setBody("");
      setErrorCode("");
      setOpen(false);
    },
    onError: error => toast.error(error.message),
  });

  const faqs = useMemo(() => matchOjuBotFaqs(query), [query]);
  const noMatch = query.trim().length >= 3 && faqs.length === 0;

  const principal = user?.role === "administrador principal";
  if (principal || location === "/admin/canal") return null;

  function openTicket(prefill?: string) {
    setTicket(true);
    setPicked(null);
    setErrorCode(makeDeskErrorCode());
    if (prefill && !subject) setSubject(prefill.slice(0, 180));
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open ? (
        <section className="mb-3 flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-[#242017]/15 bg-[#f7f5ef] shadow-2xl">
          <header className="flex items-center justify-between bg-[#242017] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Ojú Bot</p>
              <p className="text-[11px] text-[#d9d1c3]">Respostas prontas. Se não achar, manda à Equipe Ojú.</p>
            </div>
            <button type="button" className="rounded-full p-1 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Fechar Ojú Bot"><X className="h-4 w-4" /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {ticket ? (
              <form className="grid gap-3" onSubmit={event => {
                event.preventDefault();
                const code = errorCode || makeDeskErrorCode();
                send.mutate({
                  category,
                  subject: subject.trim(),
                  body: `Código: ${code}\nTela: ${location}\nBusca: ${query || "—"}\n\n${body.trim()}`,
                  pagePath: location,
                });
              }}>
                <p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">Enviar ao Canal Ojú</p>
                <div className="flex flex-wrap gap-1">
                  {categories.map(item => (
                    <button type="button" key={item} onClick={() => setCategory(item)} className={`rounded-full px-2 py-1 text-xs font-semibold ${category === item ? "bg-[#242017] text-white" : "bg-[#eee9dc]"}`}>{item}</button>
                  ))}
                </div>
                <label className="grid gap-1 text-xs font-medium">Assunto<Input required minLength={4} value={subject} onChange={event => setSubject(event.target.value)} /></label>
                <label className="grid gap-1 text-xs font-medium">Código do erro (se tiver)<Input value={errorCode} onChange={event => setErrorCode(event.target.value)} placeholder="OJU-…" /></label>
                <label className="grid gap-1 text-xs font-medium">O que aconteceu / sugestão<Textarea required minLength={12} value={body} onChange={event => setBody(event.target.value)} placeholder="Tela, o que tentou, o que apareceu, sugestão." /></label>
                <div className="flex justify-between gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setTicket(false)}>Voltar</Button>
                  <Button size="sm" disabled={send.isPending} className="bg-[#242017] text-white"><Send className="mr-1 h-3.5 w-3.5" />{send.isPending ? "Enviando..." : "Enviar"}</Button>
                </div>
              </form>
            ) : picked ? (
              <div className="grid gap-3">
                <p className="font-medium">{picked.question}</p>
                <p className="text-sm leading-6 text-[#655e52]">{picked.answer}</p>
                {picked.href ? <Link href={picked.href} className="text-sm font-semibold underline" onClick={() => setOpen(false)}>Abrir esta tela</Link> : null}
                <Button size="sm" variant="outline" onClick={() => setPicked(null)}>Outra pergunta</Button>
              </div>
            ) : (
              <div className="grid gap-3">
                <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: publicar história, Home, lixeira…" />
                {noMatch ? (
                  <p className="rounded-xl bg-[#fff4ec] p-3 text-sm text-[#6b3a22]">Nenhuma resposta pronta para isso. Envie ao Canal Ojú com o código do erro e a sugestão.</p>
                ) : (
                  <ul className="grid gap-2">
                    {faqs.map(faq => (
                      <li key={faq.id}>
                        <button type="button" className="w-full rounded-xl bg-white px-3 py-2 text-left text-sm hover:bg-[#eee9dc]" onClick={() => setPicked(faq)}>{faq.question}</button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button type="button" variant="outline" className="justify-start" onClick={() => openTicket(query)}>Não achei. Enviar ao Canal Ojú</Button>
              </div>
            )}
          </div>
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => { setOpen(current => !current); setTicket(false); setPicked(null); }}
        className="inline-flex items-center gap-2 rounded-full bg-[#242017] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#3a3428]"
      >
        <MessageCircle className="h-4 w-4" />Ojú Bot
      </button>
    </div>
  );
}
