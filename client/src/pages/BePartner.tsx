import { ArrowRight, CheckCircle2, Handshake } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { trpc } from "@/lib/trpc";

const practices = ["Fotografia", "Vídeo", "Produção territorial", "Casa ou coletivo", "Outro"] as const;

export default function BePartner() {
  const [sent, setSent] = useState(false);
  const [consent, setConsent] = useState(false);
  const submit = trpc.joinRequests.submit.useMutation({
    onSuccess: () => { setSent(true); toast.success("Pedido enviado. A Ojú responde pelo contato informado."); },
    onError: error => toast.error(error.message),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) return toast.error("Confirme a leitura da Privacidade e dos Termos.");
    const data = new FormData(event.currentTarget);
    submit.mutate({
      name: String(data.get("name")),
      email: String(data.get("email")),
      whatsapp: String(data.get("whatsapp")),
      territoryText: String(data.get("territory")),
      practice: String(data.get("practice")) as (typeof practices)[number],
      message: String(data.get("message")),
    });
  }

  return (
    <div className="min-h-screen bg-[#070605] text-white">
      <PageMeta title="Ser Parceiro Ojú" description="Quem documenta no território pode pedir para operar com a Ojú. O acesso ao painel só existe depois de conversa e autorização do Super Admin." />
      <PublicHeader cinematic />
      <main className="container grid gap-12 pb-20 pt-32 lg:grid-cols-[1.05fr_.95fr]">
        <section>
          <Handshake className="h-8 w-8 text-[#ef9e59]" />
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[.16em] text-[#ef9e59]">Parceiro Ojú</p>
          <h1 className="mt-5 max-w-xl font-serif text-5xl leading-[.94] sm:text-6xl">Documentar o chão com a Ojú, no seu território.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/65">Este canal não cria login. Você conta quem é, onde atua e o que já faz. O Super Admin lê, conversa e só então libera o painel — com termo via gov.br quando o papel for administrador.</p>
          <ul className="mt-10 grid gap-4 text-sm leading-6 text-white/70">
            <li><b className="text-white">O que você passa a fazer.</b> Criar, editar e publicar o que é seu: histórias, coberturas, fotos, casas e agenda do território. Não mexe no conteúdo de outro admin nem na Home nacional.</li>
            <li><b className="text-white">Visibilidade.</b> O que você publica com autorização entra no portal (histórias, coberturas, territórios, fotógrafos). Destaque na Home continua sendo curadoria nacional.</li>
            <li><b className="text-white">Ganhos.</b> Não há porcentagem fixa neste site. Participação financeira só existe em contratação real, pela política vigente no momento do lançamento. Quem produz de verdade entra na carteira; acesso parado não gera repasse.</li>
            <li><b className="text-white">O que não é.</b> Não é emprego automático, não é anúncio disfarçado de memória, não é conta fantasma. Quem ganha acesso e não produz pode ter o convite revogado.</li>
          </ul>
          <p className="mt-8 text-xs leading-5 text-white/45">Pedido de cobertura para um evento específico: <Link href="/planejar-um-registro" className="text-[#ef9e59] underline">planejar um registro</Link>.</p>
        </section>
        <section className="h-fit rounded border border-white/15 bg-[#100d0a] p-6 sm:p-8">
          {sent ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[#ef9e59]" />
              <h2 className="mt-5 font-serif text-3xl">Pedido recebido.</h2>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/65">A Ojú responde pelo WhatsApp ou e-mail que você informou. Enquanto isso, o painel continua fechado.</p>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ef9e59]">Quero ser parceiro</p>
                <h2 className="mt-2 font-serif text-3xl">Enviar dados para conversa.</h2>
              </div>
              <label className="grid gap-2 text-sm">Nome<input required name="name" minLength={2} className="h-11 rounded border border-white/15 bg-[#17130f] px-3" /></label>
              <label className="grid gap-2 text-sm">E-mail Google que usaria no painel<input required type="email" name="email" className="h-11 rounded border border-white/15 bg-[#17130f] px-3" /></label>
              <label className="grid gap-2 text-sm">WhatsApp<input required name="whatsapp" placeholder="(92) 99999-9999" className="h-11 rounded border border-white/15 bg-[#17130f] px-3" /></label>
              <label className="grid gap-2 text-sm">Território ou cidade<input required name="territory" className="h-11 rounded border border-white/15 bg-[#17130f] px-3" /></label>
              <label className="grid gap-2 text-sm">O que você faz<select name="practice" className="h-11 rounded border border-white/15 bg-[#17130f] px-3 text-white">{practices.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="grid gap-2 text-sm">Por que a Ojú e o que você já documenta<textarea required name="message" minLength={20} className="min-h-32 rounded border border-white/15 bg-[#17130f] p-3" /></label>
              <label className="flex gap-3 text-xs leading-5 text-white/60"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 accent-[#ef9e59]" /><span>Li os <Link href="/termos-de-uso" className="text-[#ef9e59] underline">Termos</Link> e a <Link href="/privacidade" className="text-[#ef9e59] underline">Privacidade e LGPD</Link>. Este pedido não libera o painel sozinho.</span></label>
              <button type="submit" disabled={submit.isPending} className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#ed9c58] px-5 text-xs font-bold uppercase tracking-[.1em] text-[#24140b]">{submit.isPending ? "Enviando..." : <>Enviar pedido <ArrowRight className="h-4 w-4" /></>}</button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
