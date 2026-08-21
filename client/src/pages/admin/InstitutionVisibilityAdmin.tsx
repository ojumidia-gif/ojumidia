import { AlertTriangle, BadgeCheck, CalendarClock, CircleDollarSign, Filter, HandCoins, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";

const plans = {
  "Piloto solidário": { value: "7.99", label: "R$ 7,99/mês", description: "Contribuição promocional de início, para validar a adesão." },
  "Visibilidade institucional": { value: "12.90", label: "R$ 12,90/mês", description: "Perfil ativo identificado, contato autorizado e presença territorial." },
  "Perfil parceiro": { value: "24.90", label: "R$ 24,90/mês", description: "Camada institucional com agenda e serviços autorizados." },
} as const;
type Plan = keyof typeof plans;
type ExpiryFilter = "todos" | "ativos" | "vence7" | "vence30" | "vencidos" | "pendentes";
const formatMoney = (value: string | number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateInput = (date: Date) => date.toISOString().slice(0, 10);
const addMonth = (date: Date) => { const next = new Date(date); next.setMonth(next.getMonth() + 1); return next; };
const daysUntil = (value: Date | string) => Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);

export default function InstitutionVisibilityAdmin() {
  const utils = trpc.useUtils();
  const { user } = useAuth(); const principal = user?.role === "administrador principal";
  const institutions = trpc.community.listInstitutions.useQuery();
  const visibilities = trpc.community.listInstitutionVisibilities.useQuery();
  const captors = trpc.community.visibilityCaptors.useQuery();
  const activePolicy = trpc.financial.activePolicy.useQuery({ scope: "Visibilidade institucional" });
  const summary = trpc.community.visibilityRevenueSummary.useQuery();
  const [plan, setPlan] = useState<Plan>("Visibilidade institucional");
  const [startsAt, setStartsAt] = useState(dateInput(new Date()));
  const [expiresAt, setExpiresAt] = useState(dateInput(addMonth(new Date())));
  const [grossAmount, setGrossAmount] = useState<string>(plans["Visibilidade institucional"].value);
  const [netAmount, setNetAmount] = useState<string>(plans["Visibilidade institucional"].value);
  const [hasCaptor, setHasCaptor] = useState(true);
  const [capturedByUserId, setCapturedByUserId] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("todos");
  const refresh = () => { utils.community.listInstitutionVisibilities.invalidate(); utils.community.visibilityRevenueSummary.invalidate(); utils.community.publicInstitutions.invalidate(); };
  const create = trpc.community.createInstitutionVisibility.useMutation({ onSuccess: () => { toast.success("Vigência criada. Confirme o recebimento para ativá-la."); refresh(); }, onError: error => toast.error(error.message) });
  const confirm = trpc.community.confirmInstitutionVisibility.useMutation({ onSuccess: () => { toast.success("Visibilidade institucional ativada."); refresh(); }, onError: error => toast.error(error.message) });
  const cancel = trpc.community.cancelInstitutionVisibility.useMutation({ onSuccess: () => { toast.success("Visibilidade cancelada; o perfil documental foi preservado."); refresh(); }, onError: error => toast.error(error.message) });
  const updatePayout = trpc.community.updateInstitutionVisibilityPayout.useMutation({ onSuccess: () => { toast.success("Situação de repasse atualizada. O aviso foi registrado para o administrador quando marcado como pago."); refresh(); utils.financial.earnings.invalidate(); utils.financial.notifications.invalidate(); }, onError: error => toast.error(error.message) });

  const activeEntries = useMemo(() => visibilities.data?.filter(item => item.isCurrentlyVisible) || [], [visibilities.data]);
  const dueSoon = useMemo(() => activeEntries.filter(item => { const days = daysUntil(item.expiresAt); return days >= 0 && days <= 7; }), [activeEntries]);
  const filteredEntries = useMemo(() => (visibilities.data || []).filter(item => {
    const days = daysUntil(item.expiresAt);
    if (expiryFilter === "ativos") return item.isCurrentlyVisible;
    if (expiryFilter === "vence7") return item.isCurrentlyVisible && days >= 0 && days <= 7;
    if (expiryFilter === "vence30") return item.isCurrentlyVisible && days >= 0 && days <= 30;
    if (expiryFilter === "vencidos") return item.effectiveStatus === "Expirada";
    if (expiryFilter === "pendentes") return item.effectiveStatus === "Aguardando confirmação";
    return true;
  }), [expiryFilter, visibilities.data]);
  const distribution = useMemo(() => [
    { label: "Ojú Mídia", value: Number(summary.data?.ojuAmount ?? 0), color: "#806817" },
    { label: "Desenvolvimento", value: Number(summary.data?.developmentAmount ?? 0), color: "#ef9e59" },
    { label: "Captação", value: Number(summary.data?.captorAmount ?? 0), color: "#6b8c76" },
    { label: "Reserva", value: Number(summary.data?.reserveAmount ?? 0), color: "#8b6f9d" },
  ], [summary.data]);
  const distributionTotal = distribution.reduce((sum, item) => sum + item.value, 0);
  const activeSplit = activePolicy.data ? `${activePolicy.data.ojuPercent}% Ojú Mídia, ${activePolicy.data.developmentPercent}% desenvolvimento e manutenção, ${activePolicy.data.captorPercent}% para captação/atendimento${Number(activePolicy.data.executorPercent) ? ` e ${activePolicy.data.executorPercent}% executor` : ""}` : "50% Ojú Mídia, 30% desenvolvimento e manutenção, 20% para captação/atendimento";

  return <AdminPage eyebrow="Sustentação transparente" title="Visibilidade institucional renovável.">
    <p className="-mt-5 mb-7 max-w-3xl text-sm leading-6 text-[#655e52]">Esta área administra contribuição por presença institucional. Ela não publica conteúdos, não compra destaque editorial e não substitui consentimento. A vigência vence pela própria data, sem exigir que o portal permaneça aberto.</p>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{[{ label: "Vigências ativas", value: summary.data?.count ?? 0, icon: BadgeCheck }, { label: "Receita líquida ativa", value: formatMoney(summary.data?.netAmount ?? 0), icon: CircleDollarSign }, { label: "Ojú Mídia", value: formatMoney(summary.data?.ojuAmount ?? 0), icon: ShieldCheck }, { label: "Desenvolvimento", value: formatMoney(summary.data?.developmentAmount ?? 0), icon: HandCoins }, { label: "Captação / reserva", value: formatMoney(Number(summary.data?.captorAmount ?? 0) + Number(summary.data?.reserveAmount ?? 0)), icon: CalendarClock }].map(({ label, value, icon: Icon }) => <article key={label} className="admin-card p-5"><Icon className="h-5 w-5 text-[#806817]" /><p className="mt-5 text-xs font-bold uppercase tracking-[.12em] text-[#806817]">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p></article>)}</section>
    <section className="admin-card mt-7 p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Distribuição das receitas ativas</p><h2 className="mt-2 font-serif text-3xl">Para onde vai cada valor líquido.</h2></div><p className="text-sm text-[#655e52]">Base atual: <b>{formatMoney(distributionTotal)}</b></p></div>{distributionTotal > 0 ? <><div className="mt-6 flex h-7 overflow-hidden rounded-full bg-[#eee9dc]" aria-label="Distribuição proporcional de receitas">{distribution.filter(item => item.value > 0).map(item => <div key={item.label} title={`${item.label}: ${formatMoney(item.value)}`} style={{ width: `${(item.value / distributionTotal) * 100}%`, background: item.color }} />)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{distribution.map(item => <div key={item.label} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.label}</span><b>{formatMoney(item.value)}</b></div>)}</div></> : <p className="mt-5 text-sm leading-6 text-[#655e52]">A barra aparecerá quando houver uma vigência ativa com receita líquida confirmada. Nenhum valor é simulado.</p>}</section>
    {dueSoon.length ? <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#b95032]/35 bg-[#fff1e8] p-5 text-[#733724]"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">{dueSoon.length} {dueSoon.length === 1 ? "perfil está próximo" : "perfis estão próximos"} do vencimento.</p><p className="mt-1 text-sm">Revise a renovação antes que a camada de visibilidade seja removida automaticamente.</p></div></div><Button onClick={() => setExpiryFilter("vence7")} variant="outline" className="border-[#b95032]/45 text-[#733724] hover:bg-[#f9dbc9]">Ver próximos vencimentos</Button></section> : null}
    <section className="mt-7 grid gap-7 xl:grid-cols-[420px_1fr]">
      <form className="admin-card grid gap-4 p-6" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); if (hasCaptor && principal && !capturedByUserId) { toast.error("Selecione o administrador responsável pela captação ou desmarque a opção."); return; } create.mutate({ institutionId: Number(data.get("institutionId")), plan, startsAt: new Date(`${startsAt}T12:00:00`), expiresAt: new Date(`${expiresAt}T12:00:00`), grossAmount: Number(grossAmount), netAmount: Number(netAmount), paymentReference: String(data.get("paymentReference")) || null, capturedByUserId: hasCaptor ? (principal ? Number(capturedByUserId) : undefined) : null }); }}>
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Nova vigência</p><h2 className="mt-2 font-serif text-3xl">Registrar contribuição</h2><p className="mt-2 text-sm leading-6 text-[#655e52]">O cadastro fica aguardando confirmação. Só então passa a ter visibilidade ativa.</p></div>
        <label className="grid gap-2 text-sm font-medium">Perfil comunitário<select required name="institutionId" className="h-10 rounded border bg-white px-3"><option value="">Selecione um perfil</option>{institutions.data?.map(item => <option key={item.id} value={item.id}>{item.name} · {item.institutionType}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium">Plano<select value={plan} onChange={event => { const next = event.target.value as Plan; setPlan(next); setGrossAmount(plans[next].value); setNetAmount(plans[next].value); }} className="h-10 rounded border bg-white px-3">{Object.entries(plans).map(([key, item]) => <option key={key} value={key}>{key} · {item.label}</option>)}</select></label>
        <p className="-mt-2 text-xs leading-5 text-[#655e52]">{plans[plan].description}</p>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Início<Input required type="date" value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">Vencimento<Input required type="date" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Valor recebido (R$)<Input required min="0.01" step="0.01" inputMode="decimal" value={grossAmount} onChange={event => setGrossAmount(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">Valor líquido (R$)<Input required min="0.01" step="0.01" inputMode="decimal" value={netAmount} onChange={event => setNetAmount(event.target.value)} /></label></div>
        <label className="grid gap-2 text-sm font-medium">Referência de pagamento (opcional)<Input name="paymentReference" placeholder="Ex.: Pix, recibo ou observação interna" /></label>
        <label className="flex gap-2 text-sm"><input checked={hasCaptor} onChange={event => setHasCaptor(event.target.checked)} type="checkbox" />Esta vigência teve captação ou atendimento por um administrador.</label>
        {principal && hasCaptor ? <label className="grid gap-2 text-sm font-medium">Administrador responsável pela captação<select required value={capturedByUserId} onChange={event => setCapturedByUserId(event.target.value)} className="h-10 rounded border bg-white px-3"><option value="">Selecione o administrador</option>{captors.data?.map(person => <option key={person.id} value={person.id}>{person.name || person.email}</option>)}</select></label> : hasCaptor ? <p className="-mt-1 text-xs leading-5 text-[#655e52]">A participação de captação será atribuída automaticamente à sua própria carteira.</p> : null}
        <section className="rounded-xl border border-[#d49b4c]/40 bg-[#fff6e8] p-4 text-sm leading-6 text-[#6b4a2b]"><b>Divisão sobre o valor líquido:</b> {activeSplit}. {activePolicy.data ? `Política ativa: versão ${activePolicy.data.version}.` : "Sem política ativa, aplica-se a regra operacional atual."} Sem captador, a parcela de captação entra na reserva operacional. A contribuição não compra curadoria editorial.</section>
        <Button disabled={create.isPending || !institutions.data?.length} className="bg-[#242017] text-white">{create.isPending ? "Registrando..." : "Registrar vigência"}</Button>
      </form>
      <div><div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Carteira de vigências</p><h2 className="mt-2 font-serif text-3xl">Ativas, vencidas e pendentes</h2></div><label className="flex items-center gap-2 text-sm text-[#655e52]"><Filter className="h-4 w-4" /><span className="sr-only">Filtrar vigências</span><select value={expiryFilter} onChange={event => setExpiryFilter(event.target.value as ExpiryFilter)} className="h-10 rounded border bg-white px-3 text-[#242017]"><option value="todos">Todas as vigências</option><option value="ativos">Visibilidade ativa</option><option value="vence7">Vence em até 7 dias</option><option value="vence30">Vence em até 30 dias</option><option value="vencidos">Vencidas</option><option value="pendentes">Aguardando confirmação</option></select></label></div>{filteredEntries.length ? <div className="grid gap-4">{filteredEntries.map(item => { const remaining = daysUntil(item.expiresAt); const attention = item.isCurrentlyVisible && remaining >= 0 && remaining <= 7; return <article key={item.id} className={`admin-card p-5 ${attention ? "border-[#b95032]/45 bg-[#fffaf5]" : ""}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">{item.plan} · {item.effectiveStatus}</p><h3 className="mt-2 font-serif text-2xl">{item.institutionName}</h3><p className="mt-2 text-sm text-[#655e52]">{item.institutionType} · vigência até {new Date(item.expiresAt).toLocaleDateString("pt-BR")}{item.isCurrentlyVisible ? ` · ${remaining === 0 ? "vence hoje" : `${remaining} dias restantes`}` : ""}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${attention ? "bg-[#f8d7ca] text-[#933e26]" : item.isCurrentlyVisible ? "bg-[#d6ead4] text-[#2f7040]" : "bg-[#eee9dc] text-[#655e52]"}`}>{attention ? "Renovação próxima" : item.isCurrentlyVisible ? "Visibilidade ativa" : item.effectiveStatus}</span></div><div className="mt-4 grid gap-2 text-xs text-[#655e52] sm:grid-cols-4"><span>Líquido: <b>{formatMoney(item.netAmount)}</b></span><span>Ojú: <b>{formatMoney(item.ojuAmount)}</b></span><span>Desenv.: <b>{formatMoney(item.developmentAmount)}</b></span><span>Captação: <b>{formatMoney(item.captorAmount)}</b>{item.capturedByName ? ` · ${item.capturedByName}` : " · reserva operacional"}</span></div><div className="mt-5 flex flex-wrap gap-2">{item.effectiveStatus === "Aguardando confirmação" ? <Button size="sm" onClick={() => confirm.mutate({ id: item.id, paymentReference: item.paymentReference })} disabled={confirm.isPending}>Confirmar recebimento</Button> : null}{principal && item.capturedByName ? <label className="inline-flex items-center gap-2 rounded-md border border-[#242017]/15 px-3 py-1.5 text-xs font-medium text-[#393328]">Repasse<select value={item.captorPayoutStatus} onChange={event => updatePayout.mutate({ id: item.id, captorPayoutStatus: event.target.value as "Pendente" | "Parcial" | "Pago" })} disabled={updatePayout.isPending} className="bg-transparent text-xs"><option>Pendente</option><option>Parcial</option><option>Pago</option></select></label> : null}{item.effectiveStatus === "Ativa" ? <Button size="sm" variant="outline" onClick={() => cancel.mutate({ id: item.id })} disabled={cancel.isPending}>Cancelar visibilidade</Button> : null}</div></article>; })}</div> : <EmptyAdmin text="Nenhuma vigência corresponde ao filtro. Crie uma somente após o perfil comunitário estar autorizado." />}</div>
    </section>
  </AdminPage>;
}
