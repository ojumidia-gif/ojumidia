import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminPage, EmptyAdmin } from "./_shared";
import { professionalSpecialties } from "@shared/professionalSpecialties";
import { opportunityWorkTypes } from "@shared/networkOpportunities";

function money(value: string | number | null | undefined) {
  const amount = Number(value || 0);
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function OpportunitiesAdmin() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const canOperate = user?.role === "administrador" || principal;
  const utils = trpc.useUtils();
  const mine = trpc.opportunities.mine.useQuery();
  const list = trpc.opportunities.list.useQuery(undefined, { enabled: canOperate });
  const partners = trpc.partners.list.useQuery(undefined, { enabled: principal });
  const context = trpc.partners.myContext.useQuery();
  const partner = context.data?.scope === "partner" ? context.data.partners[0] : null;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const match = trpc.opportunities.match.useQuery({ opportunityId: selectedId || 0 }, { enabled: Boolean(selectedId) });
  const create = trpc.opportunities.create.useMutation({
    onSuccess: () => { toast.success("Oportunidade criada. Ainda não é pagamento."); utils.opportunities.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const invite = trpc.opportunities.invite.useMutation({
    onSuccess: () => { toast.success("Convite enviado ao perfil profissional."); utils.opportunities.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const cancel = trpc.opportunities.cancel.useMutation({
    onSuccess: () => { toast.success("Oportunidade cancelada."); utils.opportunities.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const accept = trpc.opportunities.accept.useMutation({
    onSuccess: () => { toast.success("Você aceitou. Valores e política ficam congelados."); utils.opportunities.mine.invalidate(); utils.opportunities.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const decline = trpc.opportunities.decline.useMutation({
    onSuccess: () => { toast.success("Convite recusado."); utils.opportunities.mine.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const partnerTerritories = useMemo(() => {
    if (principal) return (partners.data || []).flatMap(item => item.territories.map(territory => ({ partnerId: item.id, territoryId: territory.id, label: `${item.displayName} · ${territory.name}` })));
    return (partner?.territories || []).map(territory => ({ partnerId: partner?.partnerId || null, territoryId: territory.id, label: territory.name }));
  }, [principal, partners.data, partner]);

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const scope = String(data.get("scope") || "").split(":");
    const specialtyIds = professionalSpecialties.map(item => item.id).filter(id => data.get(`specialty-${id}`) === "on");
    if (!specialtyIds.length) return toast.error("Marque ao menos uma especialidade necessária.");
    create.mutate({
      title: String(data.get("title")),
      briefing: String(data.get("briefing")),
      workType: String(data.get("workType")) as typeof opportunityWorkTypes[number],
      territoryId: Number(scope[1] || data.get("territoryId")),
      partnerId: scope[0] ? Number(scope[0]) : partner?.partnerId || null,
      commercialRequestId: String(data.get("commercialRequestId") || "") ? Number(data.get("commercialRequestId")) : null,
      durationText: String(data.get("durationText") || "") || null,
      totalValue: Number(data.get("totalValue")),
      specialtyIds,
      eventDate: String(data.get("eventDate") || "") ? new Date(`${String(data.get("eventDate"))}T12:00:00`) : null,
      acceptanceDeadline: String(data.get("acceptanceDeadline") || "") ? new Date(`${String(data.get("acceptanceDeadline"))}T23:59:00`) : null,
    });
  }

  return (
    <AdminPage eyebrow="Rede Ojú" title="Oportunidades territoriais.">
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-oju-terra-suave">
        Isto não é checkout. O pedido do cliente continua em Solicitações. A oportunidade mostra briefing, território, data e quanto cabe ao profissional segundo a política comercial vigente — congelada no aceite.
      </p>
      {mine.data?.profile ? (
        <section className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Minhas oportunidades</p>
          <h2 className="mt-2 font-serif text-3xl">{mine.data.profile.displayName}</h2>
          <p className="mt-3 text-sm text-oju-terra-suave">Convites da Rede. Originar demanda (sem criar Opportunity) fica em <a className="font-semibold text-oju-dende" href="/rede/originar">/rede/originar</a>.</p>
          {(["disponiveis", "aceitas", "recusadas", "expiradas"] as const).map(bucket => (
            <div key={bucket} className="mt-4">
              <p className="text-sm font-semibold capitalize">{bucket === "disponiveis" ? "Disponíveis" : bucket}</p>
              {mine.data?.buckets[bucket].length ? mine.data.buckets[bucket].map(item => (
                <article key={item.invite.id} className="admin-card mt-2 p-4">
                  <p className="font-semibold">{item.opportunity.title}</p>
                  <p className="mt-1 text-sm text-oju-terra-suave">{item.opportunity.cityLabel}/{item.opportunity.uf} · {item.opportunity.workType} · {item.opportunity.specialties.map(specialty => specialty.label).join(" · ")}</p>
                  <p className="mt-2 text-sm leading-6">{item.opportunity.briefing}</p>
                  <p className="mt-2 text-sm">Total {money(item.opportunity.totalValue)} · seu valor {money(item.opportunity.professionalValue)} · Ojú {money(item.opportunity.ojuValue)} · fundo {money(item.opportunity.networkFundValue)} · política #{item.opportunity.commercialPolicyId} v{item.opportunity.commercialPolicyVersion}</p>
                  {item.opportunity.eventDate ? <p className="mt-1 text-xs text-oju-terra-suave">Quando: {new Date(item.opportunity.eventDate).toLocaleString("pt-BR")}{item.opportunity.durationText ? ` · ${item.opportunity.durationText}` : ""}</p> : null}
                  {item.opportunity.acceptanceDeadline ? <p className="mt-1 text-xs text-oju-terra-suave">Prazo: {new Date(item.opportunity.acceptanceDeadline).toLocaleString("pt-BR")}</p> : null}
                  {bucket === "disponiveis" ? (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="bg-oju-verde text-oju-branco" disabled={accept.isPending} onClick={() => accept.mutate({ inviteId: item.invite.id })}>Aceitar</Button>
                      <Button size="sm" variant="outline" disabled={decline.isPending} onClick={() => decline.mutate({ inviteId: item.invite.id })}>Recusar</Button>
                    </div>
                  ) : null}
                </article>
              )) : <p className="mt-1 text-sm text-oju-terra-suave">Nenhuma.</p>}
            </div>
          ))}
        </section>
      ) : <p className="mb-8 text-sm text-oju-terra-suave">Sem perfil profissional, esta área não lista convites. Especialidade nunca vira permissão de administrador.</p>}

      {canOperate ? (
        <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <form className="admin-card grid gap-3 p-5" onSubmit={onCreate}>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Criar oportunidade</p>
            <Input required name="title" placeholder="Ex.: Cobertura fotográfica em Manaus" />
            <Textarea required name="briefing" minLength={10} placeholder="Briefing operacional. Sem dados administrativos desnecessários." />
            <select name="workType" className="h-10 rounded border bg-white px-3">{opportunityWorkTypes.map(item => <option key={item}>{item}</option>)}</select>
            <select required name="scope" className="h-10 rounded border bg-white px-3">
              <option value="">Território</option>
              {partnerTerritories.map(item => <option key={`${item.partnerId}:${item.territoryId}`} value={`${item.partnerId || ""}:${item.territoryId}`}>{item.label}</option>)}
            </select>
            <Input name="commercialRequestId" type="number" min={1} placeholder="ID da solicitação comercial (opcional)" />
            <Input required name="totalValue" type="number" min={1} step="0.01" placeholder="Valor total previsto" />
            <Input name="eventDate" type="date" />
            <Input name="durationText" placeholder="Duração estimada" />
            <Input name="acceptanceDeadline" type="date" />
            <fieldset className="grid gap-2">{professionalSpecialties.map(item => <label key={item.id} className="flex gap-2 text-sm"><input type="checkbox" name={`specialty-${item.id}`} />{item.label}</label>)}</fieldset>
            <Button disabled={create.isPending} className="bg-oju-verde text-oju-branco">{create.isPending ? "Salvando..." : "Criar rascunho"}</Button>
          </form>
          <div>
            {list.data?.length ? list.data.map(item => (
              <article key={item.id} className="admin-card mb-3 p-4">
                <p className="text-xs uppercase tracking-[.12em] text-[#806817]">{item.status} · {item.origin} · {item.cityLabel}/{item.uf}</p>
                <h3 className="mt-1 font-serif text-2xl">{item.title}</h3>
                <p className="mt-2 text-sm">{item.specialties.map(specialty => specialty.label).join(" · ")}</p>
                <p className="mt-2 text-sm">Total {money(item.totalValue)} · profissional {money(item.professionalValue)} · Ojú {money(item.ojuValue)} · fundo {money(item.networkFundValue)} · política #{item.commercialPolicyId} v{item.commercialPolicyVersion}</p>
                {item.acceptedProfessionalProfileId ? <p className="mt-2 text-sm">Aceita pelo perfil #{item.acceptedProfessionalProfileId}</p> : null}
                <p className="mt-2 text-xs text-oju-terra-suave">Convites: {item.invites.map(invite => `${invite.professionalProfileId}:${invite.status}`).join(" · ") || "nenhum"}</p>
                {item.status === "Rascunho" || item.status === "Aberta" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(item.id)}>Ver matching</Button>
                    <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate({ id: item.id })}>Cancelar</Button>
                  </div>
                ) : null}
                {selectedId === item.id ? (
                  <div className="mt-3 grid gap-2">
                    {match.data ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#806817]">Elegíveis (sem ranking)</p>
                        {match.data.eligible.length ? match.data.eligible.map(profile => (
                          <button key={profile.id} type="button" className="rounded border px-3 py-2 text-left text-sm" disabled={invite.isPending} onClick={() => invite.mutate({ opportunityId: item.id, professionalProfileId: profile.id })}>
                            Convidar {profile.displayName} · {profile.specialties.map(specialty => specialty.label).join(" · ")}
                          </button>
                        )) : <p className="text-sm text-oju-terra-suave">Ninguém elegível neste território/especialidade.</p>}
                        {match.data.ineligible.length ? (
                          <>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[.12em] text-[#806817]">Não elegíveis</p>
                            {match.data.ineligible.map(profile => (
                              <p key={profile.id} className="rounded border border-dashed px-3 py-2 text-sm text-oju-terra-suave">{profile.displayName}: {profile.reasons.join(" ")}</p>
                            ))}
                          </>
                        ) : null}
                      </>
                    ) : <p className="text-sm text-oju-terra-suave">Carregando matching...</p>}
                  </div>
                ) : null}
              </article>
            )) : <EmptyAdmin text="Nenhuma oportunidade neste escopo." />}
          </div>
        </section>
      ) : null}
    </AdminPage>
  );
}
