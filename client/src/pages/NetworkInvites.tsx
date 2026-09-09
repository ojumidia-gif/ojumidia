import { FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TERMS_OF_USE_VERSION } from "@shared/legalVersions";

function money(value: string | number | null | undefined) {
  const amount = Number(value || 0);
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function NetworkInvites() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const legal = trpc.legal.current.useQuery(undefined, { enabled: Boolean(user) });
  const mine = trpc.opportunities.mine.useQuery(undefined, { enabled: Boolean(user) });
  const acceptTerms = trpc.legal.accept.useMutation({
    onSuccess: () => { toast.success("Termos de Uso registrados. Não é assinatura gov.br."); utils.legal.current.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const accept = trpc.opportunities.accept.useMutation({
    onSuccess: () => { toast.success("Convite aceito. A Production operacional pode nascer."); utils.opportunities.mine.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const decline = trpc.opportunities.decline.useMutation({
    onSuccess: () => { toast.success("Convite recusado."); utils.opportunities.mine.invalidate(); },
    onError: error => toast.error(error.message),
  });

  function onAcceptTerms(event: FormEvent) {
    event.preventDefault();
    acceptTerms.mutate({ documentVersion: TERMS_OF_USE_VERSION, context: "network-operation" });
  }

  return (
    <div className="public-page">
      <PageMeta title="Convites da Rede · Ojú" description="Convites da Opportunity para o perfil profissional autenticado." url="/rede/convites" />
      <PublicHeader />
      <main className="container max-w-3xl pb-20 pt-16">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-oju-dende">Rede Ojú</p>
        <h1 className="mt-4 font-serif text-5xl">Convites</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-oju-terra-suave">
          Somente o perfil convidado aceita. Isto não abre o Centro Administrativo e não usa gov.br.
        </p>
        {loading ? <p className="mt-8 text-sm">Carregando sessão…</p> : null}
        {!loading && !user ? (
          <div className="mt-10">
            <p className="text-sm text-oju-terra-suave">Entre com a conta do perfil profissional.</p>
            <Button className="mt-4 bg-oju-verde text-oju-branco" onClick={() => startLogin()}>Entrar</Button>
          </div>
        ) : null}
        {user && legal.data && !legal.data.accepted ? (
          <form className="mt-8 border border-oju-terra/12 p-5" onSubmit={onAcceptTerms}>
            <p className="text-sm leading-6">Aceite a versão {legal.data.documentVersion} dos Termos de Uso para operar a Rede. Não é assinatura digital.</p>
            <Button disabled={acceptTerms.isPending} className="mt-4 bg-oju-verde text-oju-branco">Registrar aceite</Button>
          </form>
        ) : null}
        {mine.data?.profile ? (
          <section className="mt-10">
            <p className="text-sm font-semibold">{mine.data.profile.displayName}</p>
            {(["disponiveis", "aceitas", "recusadas", "expiradas"] as const).map(bucket => (
              <div key={bucket} className="mt-6">
                <p className="text-sm font-semibold capitalize">{bucket === "disponiveis" ? "Disponíveis" : bucket}</p>
                {mine.data?.buckets[bucket].length ? mine.data.buckets[bucket].map(item => (
                  <article key={item.invite.id} className="mt-3 border border-oju-terra/12 p-4">
                    <p className="font-semibold">{item.opportunity.title}</p>
                    <p className="mt-1 text-sm text-oju-terra-suave">{item.opportunity.workType} · {money(item.opportunity.professionalValue)}</p>
                    {bucket === "disponiveis" ? (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" className="bg-oju-verde text-oju-branco" disabled={accept.isPending || !legal.data?.accepted} onClick={() => accept.mutate({ inviteId: item.invite.id })}>Aceitar</Button>
                        <Button size="sm" variant="outline" disabled={decline.isPending} onClick={() => decline.mutate({ inviteId: item.invite.id })}>Recusar</Button>
                      </div>
                    ) : null}
                  </article>
                )) : <p className="mt-1 text-sm text-oju-terra-suave">Nenhuma.</p>}
              </div>
            ))}
          </section>
        ) : user ? <p className="mt-10 text-sm text-oju-terra-suave">Sem perfil profissional ativo nesta conta.</p> : null}
        <Link href="/rede/producoes" className="mt-12 mr-6 inline-block text-sm font-semibold text-oju-dende">Produções</Link>
        <Link href="/rede/originar" className="mt-12 inline-block text-sm font-semibold text-oju-dende">Originar demanda</Link>
      </main>
    </div>
  );
}
