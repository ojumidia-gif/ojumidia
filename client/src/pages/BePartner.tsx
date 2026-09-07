import { ArrowRight, CheckCircle2, Handshake } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { CityOfOperationSelect, emptyCitySelection } from "@/components/CityOfOperationSelect";
import { citySelectionText } from "@shared/brazilPlaces";
import { networkBondsNow, professionalSpecialties, type NetworkBondNowId, type ProfessionalSpecialtyId } from "@shared/professionalSpecialties";
import { trpc } from "@/lib/trpc";

export default function BePartner() {
  const [sent, setSent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [city, setCity] = useState(emptyCitySelection);
  const [specialties, setSpecialties] = useState<ProfessionalSpecialtyId[]>([]);
  const [bond, setBond] = useState<NetworkBondNowId>("criador-parceiro");
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
    if (!specialties.length) return toast.error("Marque ao menos uma especialidade. Isso descreve o que você faz, não o que o sistema libera.");
    const hasOwnMedia = bond === "parceiro-midia";
    if (hasOwnMedia && !String(data.get("mediaOutletName") || "").trim()) return toast.error("Informe o nome da sua mídia, página ou projeto.");
    submit.mutate({
      name: String(data.get("name")),
      email: String(data.get("email")),
      whatsapp: String(data.get("whatsapp")),
      territoryText,
      practices: specialties,
      networkBond: bond,
      hasOwnMedia,
      mediaOutletName: String(data.get("mediaOutletName") || "") || null,
      mediaOutletUrl: String(data.get("mediaOutletUrl") || "") || null,
      message: String(data.get("message")),
    });
  }

  return (
    <div className="public-page overflow-x-hidden">
      <PageMeta title="Ser Parceiro Ojú" description="Peça para entrar na Rede Ojú. Especialidade é o que você faz. O acesso ao painel só existe depois da Equipe Ojú habilitar." />
      <PublicHeader />
      <main className="container grid gap-10 pb-20 pt-28 sm:gap-12 sm:pt-16 lg:grid-cols-[1.05fr_.95fr]">
        <section>
          <Handshake className="h-8 w-8 text-oju-dende" />
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">Rede Ojú</p>
          <h1 className="mt-5 max-w-xl break-words font-serif text-4xl leading-[.94] sm:text-6xl">Entrar na Rede, na sua cidade.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-oju-terra-suave">Este canal é gratuito e não cria login. Você diz como quer participar, o que já faz e em que cidade atua. A Equipe Ojú lê e só então libera o painel — com termo via gov.br quando couber.</p>
          <ul className="mt-10 grid gap-4 text-sm leading-6 text-oju-terra-suave">
            <li><b className="text-oju-terra">Especialidade.</b> Quem você é (fotógrafo, historymaker, várias ao mesmo tempo). Não é permissão de administrador.</li>
            <li><b className="text-oju-terra">Vínculo.</b> Como você entra: criador parceiro, ou já com mídia própria.</li>
            <li><b className="text-oju-terra">Permissão.</b> Só a Equipe Ojú define o que o painel libera. Profissão não sobe privilégio.</li>
            <li><b className="text-oju-terra">Cidade.</b> O território autorizado continua sendo estado e município.</li>
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
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-oju-dende">Candidatura</p>
                <h2 className="mt-2 font-serif text-3xl">Como você quer participar da Rede Ojú?</h2>
              </div>
              <label className="grid gap-2 text-sm">Nome<input required name="name" minLength={2} autoComplete="name" className="h-11 w-full min-w-0 rounded border border-oju-terra/12 bg-oju-paz-claro px-3 text-oju-terra" /></label>
              <label className="grid gap-2 text-sm">E-mail para resposta<input required type="email" name="email" autoComplete="email" inputMode="email" placeholder="voce@email.com" className="h-11 w-full min-w-0 rounded border border-oju-terra/12 bg-oju-paz-claro px-3 text-oju-terra" /></label>
              <label className="grid gap-2 text-sm">WhatsApp<input required name="whatsapp" autoComplete="tel" inputMode="tel" placeholder="(92) 99999-9999" className="h-11 w-full min-w-0 rounded border border-oju-terra/12 bg-oju-paz-claro px-3 text-oju-terra" /></label>
              <CityOfOperationSelect required value={city} onChange={setCity} />
              <fieldset className="grid gap-2">
                <legend className="text-sm">Vínculo com a Rede</legend>
                <div className="grid gap-2">
                  {networkBondsNow.map(item => (
                    <label key={item.id} className={`grid cursor-pointer gap-1 rounded border px-3 py-3 text-sm ${bond === item.id ? "border-oju-dende/50 bg-oju-paz" : "border-oju-terra/12 bg-oju-paz"}`}>
                      <span className="flex items-start gap-3">
                        <input type="radio" className="mt-1 accent-oju-verde" name="networkBond" checked={bond === item.id} onChange={() => setBond(item.id)} />
                        <span><b className="text-oju-terra">{item.label}.</b> {item.summary}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {bond === "parceiro-midia" ? (
                <div className="grid gap-3 rounded border border-oju-terra/12 bg-oju-paz p-3">
                  <p className="text-xs leading-5 text-oju-terra-suave">Já tenho minha mídia: a marca permanece. A Ojú não pede para você abandonar o veículo.</p>
                  <label className="grid gap-2 text-sm">Nome da mídia, página ou projeto<input required name="mediaOutletName" minLength={2} className="h-11 rounded border border-oju-terra/12 bg-oju-paz-claro px-3" /></label>
                  <label className="grid gap-2 text-sm">Site ou Instagram (opcional)<input name="mediaOutletUrl" placeholder="@sua.midia ou https://" className="h-11 rounded border border-oju-terra/12 bg-oju-paz-claro px-3" /></label>
                </div>
              ) : null}
              <fieldset className="grid gap-2">
                <legend className="text-sm">Especialidades (pode marcar mais de uma)</legend>
                <p className="text-xs leading-5 text-oju-terra-suave">Isto descreve o ofício. Não concede acesso de editor, aprovador ou Super Admin.</p>
                <div className="grid gap-2">
                  {professionalSpecialties.map(item => {
                    const checked = specialties.includes(item.id);
                    return (
                      <label key={item.id} className={`grid cursor-pointer gap-1 rounded border px-3 py-3 text-sm ${checked ? "border-oju-dende/50 bg-oju-paz" : "border-oju-terra/12 bg-oju-paz"}`}>
                        <span className="flex items-start gap-3">
                          <input type="checkbox" className="mt-1 accent-oju-verde" checked={checked} onChange={() => setSpecialties(current => current.includes(item.id) ? current.filter(value => value !== item.id) : [...current, item.id])} />
                          <span><b className="text-oju-terra">{item.label}.</b> {item.summary}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
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
