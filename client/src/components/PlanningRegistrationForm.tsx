import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const formats = ["Fotografia documental", "Vídeo documental", "Cobertura integrada", "Ainda preciso de orientação"] as const;
type Format = (typeof formats)[number];

const fieldClass = "border-oju-terra/20 bg-oju-paz-claro text-oju-terra placeholder:text-oju-terra-suave focus-visible:border-oju-verde focus-visible:ring-oju-verde";

export function PlanningRegistrationForm({ compact = false }: { compact?: boolean }) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [format, setFormat] = useState<Format>("Ainda preciso de orientação");
  const [territory, setTerritory] = useState("");
  const [context, setContext] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  const request = trpc.commercial.requestCoverage.useMutation({
    onSuccess: () => {
      setSent(true);
      toast.success("Seu pedido de planejamento foi recebido pela Ojú.");
    },
    onError: error => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      toast.error("Confirme que a Ojú pode usar seus dados para responder ao seu pedido.");
      return;
    }
    request.mutate({
      clientName: name,
      contact: whatsapp,
      whatsapp,
      email: email.trim() || undefined,
      eventType: format === "Ainda preciso de orientação" ? "Planejamento de registro" : `Planejamento de registro — ${format}`,
      location: territory.trim() || undefined,
      needsPhotography: format === "Fotografia documental" || format === "Cobertura integrada",
      needsVideo: format === "Vídeo documental" || format === "Cobertura integrada",
      needsMiniclip: false,
      needsDocumentary: format === "Vídeo documental",
      needsFullCoverage: format === "Cobertura integrada",
      needsFormatGuidance: format === "Ainda preciso de orientação",
      objective: context.trim() || undefined,
      notes: "Origem: formulário público Planejar um registro.",
    });
  }

  if (sent) {
    return (
      <section className="public-surface p-7 sm:p-9">
        <CheckCircle2 className="h-10 w-10 text-oju-verde" aria-hidden="true" />
        <h2 className="mt-5 font-serif text-3xl">A conversa pode começar.</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-oju-terra-suave">A solicitação entrou no fluxo comercial da Ojú. Se preferir, continue a conversa pelo WhatsApp — é o canal da escuta, não um chat no site.</p>
        <a href="https://wa.me/5592920019527" target="_blank" rel="noreferrer" className="public-cta mt-6">
          <MessageCircle className="h-4 w-4" /> Continuar no WhatsApp
        </a>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className={`public-surface ${compact ? "p-5" : "p-6 sm:p-8"}`}>
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-oju-terra/10 pb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-oju-dende">Chamar a Ojú</p>
          <h2 className="mt-3 font-serif text-3xl">Conte o que precisa permanecer.</h2>
        </div>
        <p className="max-w-xs text-xs leading-5 text-oju-terra-suave">Você não precisa chegar com um pacote definido. A Ojú começa entendendo o contexto.</p>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">Nome ou organização<input required value={name} onChange={event => setName(event.target.value)} className={`h-11 rounded px-3 ${fieldClass}`} /></label>
        <label className="grid gap-2 text-sm font-medium">WhatsApp para contato<input required value={whatsapp} onChange={event => setWhatsapp(event.target.value)} placeholder="(92) 99999-9999" className={`h-11 rounded px-3 ${fieldClass}`} /></label>
        <label className="grid gap-2 text-sm font-medium">E-mail <span className="font-normal text-oju-terra-suave">(opcional)</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} className={`h-11 rounded px-3 ${fieldClass}`} /></label>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">O que você imagina registrar?</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {formats.map(item => (
              <label key={item} className={`flex cursor-pointer items-center gap-3 border px-3 py-3 text-sm transition ${format === item ? "border-oju-verde bg-oju-verde/10" : "border-oju-terra/12 bg-oju-paz"}`}>
                <input type="radio" name="format" value={item} checked={format === item} onChange={() => setFormat(item)} />
                {item}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">Cidade, território ou local de referência <span className="font-normal text-oju-terra-suave">(opcional)</span><input value={territory} onChange={event => setTerritory(event.target.value)} className={`h-11 rounded px-3 ${fieldClass}`} /></label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">O que é importante preservar?<textarea value={context} onChange={event => setContext(event.target.value)} rows={4} placeholder="Conte o contexto, as pessoas envolvidas e o que a Ojú precisa compreender antes de sugerir um formato." className={`resize-y rounded px-3 py-3 ${fieldClass}`} /></label>
        <label className="flex gap-3 text-xs leading-5 text-oju-terra-suave sm:col-span-2"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-oju-verde" /><span>Autorizo a Ojú a usar estes dados exclusivamente para responder a este pedido, nos termos da <Link href="/privacidade" className="text-oju-dende underline">Privacidade e LGPD</Link> e dos <Link href="/termos-de-uso" className="text-oju-dende underline">Termos de uso</Link>.</span></label>
      </div>
      <button disabled={request.isPending} className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 bg-oju-verde px-6 text-xs font-bold uppercase tracking-[.1em] text-oju-branco transition hover:bg-oju-verde-profundo disabled:cursor-not-allowed disabled:opacity-60">
        {request.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando</> : "Enviar para planejamento"}
      </button>
    </form>
  );
}
