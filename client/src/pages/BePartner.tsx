import { ArrowRight, CheckCircle2, Handshake } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { CityOfOperationSelect, emptyCitySelection } from "@/components/CityOfOperationSelect";
import { citySelectionText } from "@shared/brazilPlaces";
import { trpc } from "@/lib/trpc";

const practices = ["Fotografia", "Vídeo", "Produção territorial", "Casa ou coletivo", "Outro"] as const;

export default function BePartner() {
  const [sent, setSent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [city, setCity] = useState(emptyCitySelection);
  const submit = trpc.joinRequests.submit.useMutation({
    onSuccess: () => { setSent(true); toast.success("Pedido enviado. A Ojú responde pelo contato informado."); },
    onError: error => toast.error(error.message),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) return toast.error("Confirme a leitura da Privacidade e dos Termos.");
    const data = new FormData(event.currentTarget);
    const territoryText = citySelectionText(city);
    if (!territoryText) return toast.error("Selecione a cidade de atuação: estado e município, ou Outro.");
    submit.mutate({
      name: String(data.get("name")),
      email: String(data.get("email")),
      whatsapp: String(data.get("whatsapp")),
      territoryText,
      practice: String(data.get("practice")) as (typeof practices)[number],
      message: String(data.get("message")),
    });
  }

  return (
    <div className="public-page overflow-x-hidden">
      <PageMeta title="Ser Parceiro Ojú" description="Quem documenta na sua cidade pode pedir para operar com a Ojú. O acesso de criador parceiro só existe depois de conversa com a Equipe Ojú." />
      <PublicHeader />
      <main className="container grid gap-10 pb-20 pt-28 sm:gap-12 sm:pt-16 lg:grid-cols-[1.05fr_.95fr]">
        <section>
          <Handshake className="h-8 w-8 text-oju-dende" />
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">Parceiro Ojú</p>
          <h1 className="mt-5 max-w-xl break-words font-serif text-4xl leading-[.94] sm:text-6xl">Documentar o chão com a Ojú, na sua cidade.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-oju-terra-suave">Este canal não cria login. Você conta quem é, em que cidade atua e o que já faz. A Equipe Ojú lê, conversa e só então libera o acesso de criador parceiro — com termo via gov.br quando couber.</p>
          <ul className="mt-10 grid gap-4 text-sm leading-6 text-oju-terra-suave">
            <li><b className="text-oju-terra">O que você passa a fazer.</b> Como criador parceiro: criar, editar e publicar o que é seu — histórias, coberturas, fotos, casas e agenda da sua cidade. Não mexe no conteúdo de outro parceiro nem na Home nacional.</li>
            <li><b className="text-oju-terra">Visibilidade.</b> O que você publica com autorização entra no portal (histórias, coberturas, cidades, fotógrafos). Destaque na Home continua sendo curadoria nacional.</li>
            <li><b className="text-oju-terra">Ganhos.</b> Não há porcentagem fixa neste site. Participação financeira só existe em contratação real, pela política vigente no momento do lançamento. Quem produz de verdade entra na carteira; acesso parado não gera repasse.</li>
            <li><b className="text-oju-terra">O que não é.</b> Não é emprego automático, não é anúncio disfarçado de memória, não é conta fantasma. Quem ganha acesso e não produz pode ter o convite revogado.</li>
          </ul>
          <p className="mt-8 text-xs leading-5 text-oju-terra-suave">Pedido de cobertura para um evento específico: <Link href="/planejar-um-registro" className="text-oju-dende underline">planejar um registro</Link>.</p>
        </section>
        <section className="h-fit rounded border border-oju-terra/12 bg-oju-paz-claro p-6 sm:p-8">
          {sent ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-oju-dende" />
              <h2 className="mt-5 font-serif text-3xl">Pedido recebido.</h2>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-oju-terra-suave">A Ojú responde pelo WhatsApp ou e-mail que você informou. Enquanto isso, o painel continua fechado.</p>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-oju-dende">Quero ser parceiro</p>
                <h2 className="mt-2 font-serif text-3xl">Enviar dados para conversa.</h2>
              </div>
              <label className="grid gap-2 text-sm">Nome<input required name="name" minLength={2} autoComplete="name" className="h-11 w-full min-w-0 rounded border border-oju-terra/12 bg-oju-paz-claro px-3 text-oju-terra" /></label>
              <label className="grid gap-2 text-sm">E-mail para resposta<input required type="email" name="email" autoComplete="email" inputMode="email" placeholder="voce@email.com" className="h-11 w-full min-w-0 rounded border border-oju-terra/12 bg-oju-paz-claro px-3 text-oju-terra" /></label>
              <label className="grid gap-2 text-sm">WhatsApp<input required name="whatsapp" autoComplete="tel" inputMode="tel" placeholder="(92) 99999-9999" className="h-11 w-full min-w-0 rounded border border-oju-terra/12 bg-oju-paz-claro px-3 text-oju-terra" /></label>
              <CityOfOperationSelect required value={city} onChange={setCity} />
              <label className="grid gap-2 text-sm">O que você faz<select name="practice" className="h-11 w-full min-w-0 rounded border border-oju-terra/12 bg-oju-paz-claro px-3 text-oju-terra">{practices.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="grid gap-2 text-sm">Por que a Ojú e o que você já documenta<textarea required name="message" minLength={10} className="min-h-32 w-full min-w-0 rounded border border-oju-terra/12 bg-oju-paz-claro p-3 text-oju-terra" /></label>
              <label className="flex gap-3 text-xs leading-5 text-oju-terra-suave"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 shrink-0 accent-oju-verde" /><span>Li os <Link href="/termos-de-uso" className="text-oju-dende underline">Termos</Link> e a <Link href="/privacidade" className="text-oju-dende underline">Privacidade e LGPD</Link>. Este pedido não libera o painel sozinho.</span></label>
              <button type="submit" disabled={submit.isPending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-oju-verde px-5 text-xs font-bold uppercase tracking-[.1em] text-oju-branco sm:w-auto">{submit.isPending ? "Enviando..." : <>Enviar pedido <ArrowRight className="h-4 w-4" /></>}</button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
