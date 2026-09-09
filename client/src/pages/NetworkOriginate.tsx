import { FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { opportunityWorkTypes } from "@shared/networkOpportunities";

export default function NetworkOriginate() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const mine = trpc.commercial.myOriginationLeads.useQuery(undefined, { enabled: Boolean(user) });
  const submit = trpc.commercial.originateLead.useMutation({
    onSuccess: () => {
      toast.success("Demanda enviada à Rede para análise. Isso não cria Opportunity nem publicação.");
      utils.commercial.myOriginationLeads.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    submit.mutate({
      clientName: String(data.get("clientName")),
      contact: String(data.get("contact")),
      title: String(data.get("title")),
      briefing: String(data.get("briefing")),
      workType: String(data.get("workType")) as typeof opportunityWorkTypes[number],
      durationText: String(data.get("durationText") || "") || null,
      eventDate: String(data.get("eventDate") || "") ? new Date(`${String(data.get("eventDate"))}T12:00:00`) : null,
    });
  }

  return (
    <div className="public-page">
      <PageMeta title="Originar demanda · Rede Ojú" description="Profissional da Rede apresenta uma demanda territorial para análise da Ojú." url="/rede/originar" />
      <PublicHeader />
      <main className="container max-w-3xl pb-20 pt-16">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-oju-dende">Rede Ojú</p>
        <h1 className="mt-4 font-serif text-5xl">Originar uma demanda</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-oju-terra-suave">
          Você apresenta contexto, território e necessidade. A Ojú analisa. Isto não é marketplace, não publica na Home e não cria Opportunity sozinho.
        </p>
        {loading ? <p className="mt-8 text-sm">Carregando sessão…</p> : null}
        {!loading && !user ? (
          <div className="mt-10">
            <p className="text-sm text-oju-terra-suave">Entre com a conta vinculada ao seu perfil profissional. Isso não concede acesso administrativo.</p>
            <Button className="mt-4 bg-oju-verde text-oju-branco" onClick={() => startLogin()}>Entrar</Button>
          </div>
        ) : null}
        {user && !mine.data?.profile ? (
          <p className="mt-10 text-sm text-oju-terra-suave">Não há perfil profissional Ativo nesta conta. Especialidade não vira permissão de administrador.</p>
        ) : null}
        {mine.data?.profile ? (
          <>
            <p className="mt-8 text-sm font-semibold">{mine.data.profile.displayName}</p>
            {mine.data.profile.territoryName || mine.data.profile.territoryId ? (
              <p className="mt-2 text-sm text-oju-terra-suave">
                Território do perfil: {mine.data.profile.territoryName || `id ${mine.data.profile.territoryId}`}. A originação usa este território; não há escolha de cidade alheia neste formulário.
              </p>
            ) : (
              <p className="mt-2 text-sm text-oju-terra-suave">Perfil sem território definido — a API recusa originação até o território estar no perfil.</p>
            )}
            <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
              <Input required name="clientName" placeholder="Casa, parceiro ou pessoa de contato" />
              <Input required name="contact" placeholder="WhatsApp ou e-mail para a Ojú retornar" />
              <Input required name="title" placeholder="Título da demanda" />
              <select name="workType" className="h-10 rounded border bg-white px-3">{opportunityWorkTypes.map(item => <option key={item}>{item}</option>)}</select>
              <Textarea required minLength={10} name="briefing" placeholder="Contexto territorial, necessidade e relação. Sem preço público." />
              <Input name="eventDate" type="date" />
              <Input name="durationText" placeholder="Duração estimada (opcional)" />
              <Button disabled={submit.isPending} className="bg-oju-verde text-oju-branco">{submit.isPending ? "Enviando…" : "Enviar para análise da Rede"}</Button>
            </form>
            <section className="mt-12">
              <h2 className="font-serif text-3xl">Suas originações</h2>
              {mine.data.items.length ? mine.data.items.map(item => (
                <article key={item.id} className="mt-3 border border-oju-terra/12 p-4">
                  <p className="text-xs uppercase tracking-[.12em] text-oju-dende">{item.originKind} · {item.status}</p>
                  <p className="mt-2 font-semibold">{item.eventType}</p>
                  <p className="mt-1 text-xs text-oju-terra-suave">
                    originatedBy perfil {item.originatedByProfessionalProfileId} · createdBy user {item.createdByUserId ?? "—"} · managedBy {item.managedByUserId ?? "nenhum"}
                  </p>
                </article>
              )) : <p className="mt-3 text-sm text-oju-terra-suave">Nenhuma originação ainda.</p>}
            </section>
          </>
        ) : null}
        <Link href="/rede" className="mt-12 inline-block text-sm font-semibold text-oju-dende">Voltar à Rede</Link>
        <Link href="/rede/convites" className="mt-12 ml-6 inline-block text-sm font-semibold text-oju-dende">Convites</Link>
      </main>
    </div>
  );
}
