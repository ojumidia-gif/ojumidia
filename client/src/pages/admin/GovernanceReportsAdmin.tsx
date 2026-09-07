import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";

const categories = [
  "Violação de direitos de imagem",
  "Uso não autorizado de conteúdo",
  "Conteúdo sensível",
  "Exposição indevida de dados",
  "Violação de regras da plataforma",
  "Abuso de privilégio administrativo",
  "Fraude",
  "Comportamento suspeito",
  "Denúncia jurídica",
  "Solicitação de autoridade",
  "Outros",
] as const;

export default function GovernanceReportsAdmin() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const list = trpc.governance.listCases.useQuery({ query }, { refetchInterval: 12000 });
  const detail = trpc.governance.getCase.useQuery({ id: selectedId ?? 0 }, { enabled: Boolean(selectedId) });
  const alerts = trpc.governance.alerts.useQuery(undefined, { refetchInterval: 15000 });
  const refresh = () => { utils.governance.listCases.invalidate(); if (selectedId) utils.governance.getCase.invalidate({ id: selectedId }); utils.governance.alerts.invalidate(); };
  const createCase = trpc.governance.createCase.useMutation({ onSuccess: result => { toast.success(`Caso ${result.publicCode} aberto. Ainda não é violação confirmada.`); refresh(); }, onError: error => toast.error(error.message) });
  const updateCase = trpc.governance.updateCase.useMutation({ onSuccess: () => { toast.success("Caso atualizado."); refresh(); }, onError: error => toast.error(error.message) });
  const quarantine = trpc.governance.quarantine.useMutation({ onSuccess: () => { toast.success("Conteúdo em quarentena. O arquivo original permanece."); refresh(); }, onError: error => toast.error(error.message) });
  const preserve = trpc.governance.preserve.useMutation({ onSuccess: () => { toast.success("Preservação técnica registrada."); refresh(); }, onError: error => toast.error(error.message) });
  const releaseHold = trpc.governance.releaseHold.useMutation({ onSuccess: () => { toast.success("Preservação encerrada."); refresh(); }, onError: error => toast.error(error.message) });
  const exportEvidence = trpc.governance.exportEvidence.useMutation({
    onSuccess: result => {
      const blob = new Blob([JSON.stringify({ packageChecksum: result.packageChecksum, payload: result.payload }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${result.publicCode}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Pacote exportado. SHA-256 ${result.packageChecksum.slice(0, 12)}…`);
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const selected = useMemo(() => list.data?.items.find(item => item.id === selectedId) ?? detail.data?.item ?? null, [list.data, detail.data, selectedId]);

  return (
    <AdminPage eyebrow="Governança" title="Denúncias, incidentes e evidências.">
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-oju-terra-suave">Uma denúncia não é, por si só, uma violação confirmada. Quarentena retira o conteúdo do portal sem destruir o arquivo. Preservação (legal hold técnico) bloqueia expurgo. Políticas de retenção e atendimento a autoridades devem ser validadas juridicamente. Admin ID e IPs não são públicos.</p>
      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <form className="admin-card grid gap-3 p-6" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); createCase.mutate({ kind: "Denúncia", category: String(data.get("category")) as typeof categories[number], title: String(data.get("title")), description: String(data.get("description")), publicationId: data.get("publicationId") ? Number(data.get("publicationId")) : null, mediaId: data.get("mediaId") ? Number(data.get("mediaId")) : null, subjectUserId: data.get("subjectUserId") ? Number(data.get("subjectUserId")) : null }); }}>
          <h2 className="font-serif text-3xl">Abrir denúncia</h2>
          <label className="grid gap-2 text-sm font-medium">Categoria<select name="category" className="h-10 rounded border bg-white px-3">{categories.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium">Título<Input required name="title" minLength={4} /></label>
          <label className="grid gap-2 text-sm font-medium">Descrição<Textarea required name="description" minLength={8} /></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium">ID publicação<Input name="publicationId" type="number" min={1} /></label>
            <label className="grid gap-2 text-sm font-medium">ID mídia<Input name="mediaId" type="number" min={1} /></label>
            <label className="grid gap-2 text-sm font-medium">ID interno do admin<Input name="subjectUserId" type="number" min={1} /></label>
          </div>
          <Button disabled={createCase.isPending} className="bg-oju-verde text-oju-branco">Registrar caso</Button>
        </form>
        <aside className="admin-card p-6">
          <h2 className="font-serif text-3xl">Alertas</h2>
          {alerts.data?.items.length ? <div className="mt-4 grid gap-3">{alerts.data.items.slice(0, 8).map(item => <p key={item.id} className="text-sm leading-6 text-oju-terra-suave"><b className="text-oju-terra">{item.title}</b> · {item.status}</p>)}</div> : <p className="mt-4 text-sm text-oju-terra-suave">Nenhum alerta aberto.</p>}
        </aside>
      </section>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Casos</p><h2 className="mt-2 font-serif text-3xl">Fila de análise.</h2></div>
        <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="DEN-2026-000001, título ou ADMIN-00000012" className="max-w-sm" />
      </div>
      {list.isLoading ? <p className="mt-6 text-sm text-oju-terra-suave">Carregando...</p> : list.data?.items.length ? <div className="mt-5 grid gap-3">{list.data.items.map(item => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`admin-card p-5 text-left ${selectedId === item.id ? "ring-2 ring-[#806817]" : ""}`}><p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">{item.publicCode} · {item.status} · {item.kind}</p><h3 className="mt-2 font-serif text-2xl">{item.title}</h3><p className="mt-1 text-sm text-oju-terra-suave">{item.category} · {item.outcome || "Ainda sem decisão de mérito"}</p></button>)}</div> : <EmptyAdmin text="Nenhuma denúncia registrada." />}
      {selected && detail.data ? <section className="admin-card mt-8 p-6">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">{detail.data.item.publicCode}</p>
        <h2 className="mt-2 font-serif text-3xl">{detail.data.item.title}</h2>
        <p className="mt-3 text-sm leading-6 text-oju-terra-suave">{detail.data.item.description}</p>
        {detail.data.subject ? <p className="mt-3 text-sm">Admin relacionado: <b>{detail.data.subject.adminId}</b> · {detail.data.subject.accountStatus}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["Em análise", "Resolvida", "Rejeitada", "Arquivada"] as const).map(status => <Button key={status} size="sm" variant="outline" disabled={updateCase.isPending} onClick={() => updateCase.mutate({ id: detail.data.item.id, status, outcome: status === "Rejeitada" ? "Não confirmada" : status === "Resolvida" ? "Violação confirmada" : null, decisionNote: status === "Rejeitada" ? "Denúncia não confirmada na análise administrativa." : status === "Resolvida" ? "Violação confirmada após análise." : null })}>{status}</Button>)}
          {detail.data.item.publicationId ? <Button size="sm" className="bg-oju-verde text-oju-branco" disabled={quarantine.isPending} onClick={() => quarantine.mutate({ caseId: detail.data.item.id, publicationId: detail.data.item.publicationId ?? undefined })}>Quarentena da publicação</Button> : null}
          {detail.data.item.mediaId ? <Button size="sm" variant="outline" disabled={quarantine.isPending} onClick={() => quarantine.mutate({ caseId: detail.data.item.id, mediaId: detail.data.item.mediaId ?? undefined })}>Quarentena da mídia</Button> : null}
          {detail.data.item.publicationId ? <Button size="sm" variant="outline" disabled={preserve.isPending} onClick={() => preserve.mutate({ caseId: detail.data.item.id, resourceType: "publication", resourceId: detail.data.item.publicationId!, reason: "Preservação técnica para análise do caso." })}>Preservar publicação</Button> : null}
          {detail.data.item.mediaId ? <Button size="sm" variant="outline" disabled={preserve.isPending} onClick={() => preserve.mutate({ caseId: detail.data.item.id, resourceType: "media", resourceId: detail.data.item.mediaId!, reason: "Preservação técnica do arquivo original." })}>Preservar mídia</Button> : null}
          <Button size="sm" disabled={exportEvidence.isPending} onClick={() => exportEvidence.mutate({ caseId: detail.data.item.id })}>Exportar pacote</Button>
        </div>
        {detail.data.holds.length ? <div className="mt-6 grid gap-2">{detail.data.holds.map(hold => <div key={hold.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"><span>{hold.resourceType} #{hold.resourceId} {hold.releasedAt ? "· encerrada" : "· ativa"}</span>{!hold.releasedAt ? <Button size="sm" variant="outline" onClick={() => releaseHold.mutate({ holdId: hold.id, reason: "Encerramento explícito da preservação após decisão." })}>Encerrar preservação</Button> : null}</div>)}</div> : null}
        <div className="mt-6 grid gap-2">{detail.data.events.map(event => <p key={event.id} className="text-sm text-oju-terra-suave">{new Date(event.createdAt).toLocaleString("pt-BR")} · {event.action} · {event.detail}</p>)}</div>
      </section> : null}
    </AdminPage>
  );
}
