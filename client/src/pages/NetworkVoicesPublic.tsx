import { useState } from "react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { networkVoiceNameVisibilities, networkVoiceRelations } from "@shared/networkVoices";
import { trpc } from "@/lib/trpc";

function VoiceCard({
  body,
  speakerPublicName,
  relationKind,
  contextNote,
  story,
  photographyCredit,
  productionTitle,
  professionalName,
  houseName,
  territoryName,
}: {
  body: string;
  speakerPublicName: string | null;
  relationKind: string;
  contextNote: string | null;
  story: { title: string; href: string } | null;
  photographyCredit: string | null;
  productionTitle: string | null;
  professionalName: string | null;
  houseName: string | null;
  territoryName: string | null;
}) {
  return (
    <article className="border border-oju-terra/12 bg-oju-paz-claro p-6">
      <p className="font-serif text-2xl leading-snug">“{body}”</p>
      {speakerPublicName ? <p className="mt-5 text-sm text-oju-terra">— {speakerPublicName}</p> : <p className="mt-5 text-sm text-oju-terra-suave">— voz autorizada, sem identificação pública</p>}
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[.12em] text-oju-dende">{relationKind}</p>
      {contextNote ? <p className="mt-3 text-sm leading-6 text-oju-terra-suave">{contextNote}</p> : null}
      <dl className="mt-5 grid gap-1 text-xs leading-5 text-oju-terra-suave">
        {houseName ? <div>Casa: {houseName}</div> : null}
        {professionalName ? <div>Olhar: {professionalName}</div> : null}
        {photographyCredit ? <div>Crédito: {photographyCredit}</div> : null}
        {productionTitle ? <div>Registro: {productionTitle}</div> : null}
        {territoryName ? <div>Território: {territoryName}</div> : null}
        {story ? <div>História: <Link href={story.href} className="text-oju-verde">{story.title}</Link></div> : null}
      </dl>
    </article>
  );
}

export default function NetworkVoicesPublic() {
  const { data } = trpc.networkVoices.publicPublished.useQuery(undefined, { staleTime: 15_000 });
  const submit = trpc.networkVoices.submit.useMutation();
  const [sent, setSent] = useState(false);
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="container pb-20 pt-16">
        <section className="max-w-4xl border-b border-oju-terra/10 pb-12">
          <p className="editorial-kicker">Depoimentos</p>
          <h1 className="mt-5 font-serif text-5xl leading-[.95] sm:text-7xl">Vozes da Rede Ojú</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-oju-terra-suave">Memórias e experiências relacionadas ao universo Ojú. Não é avaliação, ranking nem comentário de vitrine. Um envio só aparece depois de análise e publicação editorial.</p>
        </section>

        <section className="mt-12">
          <p className="editorial-kicker">Curadoria Ojú</p>
          <h2 className="mt-3 font-serif text-3xl">Escolha editorial, não popularidade.</h2>
          {data?.curated.length ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {data.curated.map(item => <VoiceCard key={item.id} {...item} />)}
            </div>
          ) : (
            <p className="mt-6 max-w-xl text-sm leading-6 text-oju-terra-suave">Ainda não há depoimento selecionado pela curadoria nacional. Publicar não coloca uma voz em destaque.</p>
          )}
        </section>

        {data?.published.length ? (
          <section className="mt-16">
            <p className="editorial-kicker">Publicados</p>
            <h2 className="mt-3 font-serif text-3xl">Outras vozes autorizadas.</h2>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {data.published.map(item => <VoiceCard key={item.id} {...item} />)}
            </div>
          </section>
        ) : null}

        <section className="mt-16 max-w-2xl border border-oju-terra/12 bg-oju-paz-claro p-6 sm:p-8">
          <p className="editorial-kicker">Envio</p>
          <h2 className="mt-3 font-serif text-3xl">Oferecer um depoimento.</h2>
          <p className="mt-3 text-sm leading-6 text-oju-terra-suave">O texto entra em análise. Não é publicação automática. Não usamos estrela, voto ou pagamento para destaque.</p>
          {sent ? (
            <p className="mt-6 text-sm leading-6 text-oju-verde">Recebemos o envio. Ele permanece fora do portal até a análise editorial.</p>
          ) : (
            <form
              className="mt-6 grid gap-4"
              onSubmit={event => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                submit.mutate({
                  body: String(form.get("body")),
                  speakerName: String(form.get("speakerName") || "").trim() || undefined,
                  speakerNameVisibility: String(form.get("speakerNameVisibility")) as typeof networkVoiceNameVisibilities[number],
                  relationKind: String(form.get("relationKind")) as typeof networkVoiceRelations[number],
                  contextNote: String(form.get("contextNote") || "").trim() || undefined,
                  authorEmail: String(form.get("authorEmail")),
                  consentToEditorialReview: true,
                }, { onSuccess: () => setSent(true) });
              }}
            >
              <label htmlFor="voice-body" className="grid gap-2 text-sm">Depoimento<textarea id="voice-body" required name="body" minLength={40} className="min-h-32 rounded-sm border border-oju-terra/20 bg-oju-papel p-3" placeholder="Escreva a experiência, a memória ou o sentido do registro." /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">Identificação pública (opcional)<input name="speakerName" className="h-11 rounded-sm border border-oju-terra/20 bg-oju-papel px-3" /></label>
                <label className="grid gap-2 text-sm">Como identificar<select name="speakerNameVisibility" className="h-11 rounded-sm border border-oju-terra/20 bg-oju-papel px-3">{networkVoiceNameVisibilities.map(item => <option key={item}>{item}</option>)}</select></label>
              </div>
              <label className="grid gap-2 text-sm">Vínculo<select name="relationKind" className="h-11 rounded-sm border border-oju-terra/20 bg-oju-papel px-3">{networkVoiceRelations.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="grid gap-2 text-sm">Contexto (opcional)<input name="contextNote" maxLength={420} className="h-11 rounded-sm border border-oju-terra/20 bg-oju-papel px-3" placeholder="Casa, cobertura, território — se couber." /></label>
              <label className="grid gap-2 text-sm">E-mail para a equipe<input required type="email" name="authorEmail" className="h-11 rounded-sm border border-oju-terra/20 bg-oju-papel px-3" /></label>
              <label className="flex items-start gap-2 text-sm leading-6 text-oju-terra-suave"><input required type="checkbox" name="consent" className="mt-1" />Autorizo a análise editorial. Entendo que o depoimento não entra no portal só porque foi enviado.</label>
              <button type="submit" disabled={submit.isPending} className="public-cta w-full sm:w-auto">{submit.isPending ? "Enviando..." : "Enviar para análise"}</button>
              {submit.error ? <p className="text-sm text-oju-dende">{submit.error.message}</p> : null}
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
