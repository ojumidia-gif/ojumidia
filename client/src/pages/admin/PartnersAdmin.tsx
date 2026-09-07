import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";

const partnerStatuses = ["Rascunho", "Em revisão", "Ativo", "Suspenso", "Desativado"] as const;
const memberRoles = ["Gestor territorial", "Operador territorial", "Curador territorial"] as const;

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function PartnersAdmin() {
  const utils = trpc.useUtils();
  const partners = trpc.partners.list.useQuery();
  const territories = trpc.community.publicTerritories.useQuery();
  const accounts = trpc.media.users.useQuery();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [territoryByPartner, setTerritoryByPartner] = useState<Record<number, number>>({});
  const [memberByPartner, setMemberByPartner] = useState<Record<number, number>>({});
  const refresh = () => { utils.partners.list.invalidate(); utils.partners.myContext.invalidate(); };
  const create = trpc.partners.create.useMutation({ onSuccess: () => { toast.success("Parceiro Ojú criado como rascunho. Defina território e membros antes de ativá-lo."); setName(""); setSlug(""); setDescription(""); refresh(); }, onError: error => toast.error(error.message) });
  const update = trpc.partners.update.useMutation({ onSuccess: () => { toast.success("Governança do parceiro atualizada."); refresh(); }, onError: error => toast.error(error.message) });
  const setTerritories = trpc.partners.setTerritories.useMutation({ onSuccess: () => { toast.success("Territórios autorizados atualizados."); refresh(); }, onError: error => toast.error(error.message) });
  const setMember = trpc.partners.setMember.useMutation({ onSuccess: () => { toast.success("Membro do parceiro atualizado."); refresh(); }, onError: error => toast.error(error.message) });
  const activeAccounts = useMemo(() => (accounts.data || []).filter(account => account.role !== "criador"), [accounts.data]);

  return <AdminPage eyebrow="Governança territorial" title="Parceiros Ojú e escopos operacionais." action={<div className="flex flex-wrap gap-2"><Link href="/admin/candidaturas" className="rounded-full border border-[#242017] px-4 py-2 text-sm font-bold">Candidaturas</Link><Link href="/admin/publicacoes" className="rounded-full border border-[#242017] px-4 py-2 text-sm font-bold">Conteúdos</Link><Link href="/admin/midias" className="rounded-full border border-[#242017] px-4 py-2 text-sm font-bold">Mídias</Link><Link href="/admin/solicitacoes" className="rounded-full border border-[#242017] px-4 py-2 text-sm font-bold">Comercial</Link><Link href="/admin/colaboradores" className="rounded-full border border-[#242017] px-4 py-2 text-sm font-bold">Usuários</Link></div>}>
    <section className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
      <form className="admin-card grid gap-4 p-6" onSubmit={event => { event.preventDefault(); const normalizedSlug = slug || slugify(name); if (!normalizedSlug) return toast.error("Informe um nome válido para gerar o identificador do parceiro."); create.mutate({ displayName: name, slug: normalizedSlug, description: description || null, publicVisibility: false, status: "Rascunho" }); }}>
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Novo parceiro</p><h2 className="mt-2 font-serif text-3xl">Começar em rascunho.</h2><p className="mt-2 text-sm leading-6 text-oju-terra-suave">Um parceiro não recebe alcance público nem acesso territorial até que você associe territórios, membros autorizados e ative o registro.</p></div>
        <label className="grid gap-2 text-sm font-medium">Nome operacional<Input required value={name} onChange={event => { setName(event.target.value); if (!slug) setSlug(slugify(event.target.value)); }} placeholder="Nome do parceiro ou núcleo" /></label>
        <label className="grid gap-2 text-sm font-medium">Identificador público<Input required value={slug} onChange={event => setSlug(slugify(event.target.value))} placeholder="nome-do-parceiro" /></label>
        <label className="grid gap-2 text-sm font-medium">Descrição interna e institucional<Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Atuação, contexto e responsabilidades acordadas." /></label>
        <Button className="bg-oju-verde text-oju-branco" disabled={create.isPending}>{create.isPending ? "Criando..." : "Criar parceiro em rascunho"}</Button>
      </form>
      <aside className="admin-card p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Regra de ouro</p><h2 className="mt-2 font-serif text-3xl">Território não é um rótulo decorativo.</h2><div className="mt-5 grid gap-4 text-sm leading-6 text-oju-terra-suave"><p>O parceiro só poderá operar registros vinculados ao seu território autorizado. A plataforma mantém contas, infraestrutura, Home nacional, políticas e consolidados sob governança da Equipe Ojú.</p><p>Identidade territorial pode ser ativada no perfil do parceiro, mas a Home permanece curada pela Ojú — não é um mural de marcas.</p><p>Dados históricos continuam como operação central até você classificá-los explicitamente; nenhuma associação retroativa é feita automaticamente.</p></div></aside>
    </section>
    <section className="mt-8"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Rede cadastrada</p><h2 className="mt-2 font-serif text-3xl">Escopo, pessoas e ativação.</h2></div>
      {partners.isLoading ? <p className="mt-6 text-sm text-oju-terra-suave">Carregando parceiros...</p> : partners.data?.length ? <div className="mt-5 grid gap-5">{partners.data.map(partner => {
        const selectedTerritory = territoryByPartner[partner.id];
        const selectedMember = memberByPartner[partner.id];
        return <article key={partner.id} className="admin-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">{partner.status}</p><h3 className="mt-2 font-serif text-3xl">{partner.displayName}</h3><p className="mt-1 text-sm text-oju-terra-suave">/{partner.slug} · versão {partner.version}</p></div><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={partner.publicVisibility} onChange={event => update.mutate({ id: partner.id, expectedVersion: partner.version, publicVisibility: event.target.checked })} disabled={update.isPending} />Identidade pública contextual</label></div>
          <p className="mt-3 max-w-2xl text-xs leading-5 text-oju-terra-suave">O @ só aparece no diretório e no crédito com identidade pública ligada. Não entra na Home nacional.</p>
          <Input className="mt-3 max-w-xs" defaultValue={partner.instagramHandle ? `@${partner.instagramHandle}` : ""} placeholder="@instagram autorizado pela casa" onBlur={event => { const next = event.target.value.trim(); if ((partner.instagramHandle ? `@${partner.instagramHandle}` : "") === next) return; update.mutate({ id: partner.id, expectedVersion: partner.version, instagramHandle: next || null }); }} />
          <div className="mt-5 grid gap-5 lg:grid-cols-3"><section><p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">Status</p><select value={partner.status} className="mt-2 h-10 w-full rounded border bg-white px-3 text-sm" onChange={event => update.mutate({ id: partner.id, expectedVersion: partner.version, status: event.target.value as typeof partnerStatuses[number] })} disabled={update.isPending}>{partnerStatuses.map(status => <option key={status}>{status}</option>)}</select><p className="mt-2 text-xs leading-5 text-oju-terra-suave">A ativação só é aceita após haver ao menos um território autorizado.</p></section>
            <section><p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">Territórios autorizados</p><p className="mt-1 text-xs text-oju-terra-suave"><Link href="/admin/taxonomias" className="font-semibold underline">Abrir cadastro de territórios</Link></p><div className="mt-2 flex gap-2"><select value={selectedTerritory || ""} onChange={event => setTerritoryByPartner(previous => ({ ...previous, [partner.id]: Number(event.target.value) }))} className="h-10 min-w-0 flex-1 rounded border bg-white px-2 text-sm"><option value="">Selecionar território</option>{territories.data?.filter(territory => !partner.territories.some(item => item.id === territory.id)).map(territory => <option key={territory.id} value={territory.id}>{territory.name}</option>)}</select><Button type="button" size="sm" variant="outline" disabled={!selectedTerritory || setTerritories.isPending} onClick={() => setTerritories.mutate({ partnerId: partner.id, expectedVersion: partner.version, territoryIds: [...partner.territories.map(item => item.id), selectedTerritory] })}>Adicionar</Button></div><div className="mt-3 flex flex-wrap gap-2">{partner.territories.map(territory => <button type="button" key={territory.id} className="rounded-full bg-oju-papel px-3 py-1 text-xs" onClick={() => setTerritories.mutate({ partnerId: partner.id, expectedVersion: partner.version, territoryIds: partner.territories.filter(item => item.id !== territory.id).map(item => item.id) })} title="Remover território">{territory.name} ×</button>) || <span className="text-sm text-oju-terra-suave">Nenhum território definido.</span>}</div></section>
            <section><p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">Membros administrativos</p><div className="mt-2 flex gap-2"><select value={selectedMember || ""} onChange={event => setMemberByPartner(previous => ({ ...previous, [partner.id]: Number(event.target.value) }))} className="h-10 min-w-0 flex-1 rounded border bg-white px-2 text-sm"><option value="">Selecionar conta ativa</option>{activeAccounts.filter(account => !partner.members.some(member => member.userId === account.id)).map(account => <option key={account.id} value={account.id}>{account.name || account.email}</option>)}</select><Button type="button" size="sm" variant="outline" disabled={!selectedMember || setMember.isPending} onClick={() => setMember.mutate({ partnerId: partner.id, userId: selectedMember, operationalRole: "Operador territorial", status: "Ativo" })}>Associar</Button></div><div className="mt-3 grid gap-2">{partner.members.map(member => <div key={member.userId} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate">{member.name || member.email || `Conta #${member.userId}`}</span><select className="h-8 rounded border bg-white px-2 text-xs" value={member.operationalRole} onChange={event => setMember.mutate({ partnerId: partner.id, userId: member.userId, operationalRole: event.target.value as typeof memberRoles[number], status: member.status })}><option value="Gestor territorial">Gestor</option><option value="Operador territorial">Operador</option><option value="Curador territorial">Curador</option></select></div>) || <span className="text-sm text-oju-terra-suave">Nenhum membro associado.</span>}</div></section></div>
        </article>;
      })}</div> : <div className="mt-5"><EmptyAdmin text="Nenhum parceiro foi criado. O primeiro registro deve nascer como rascunho, receber território e membros autorizados antes de ser ativado." /></div>}
    </section>
  </AdminPage>;
}
