import { BadgeCheck, FileDown, FileSignature, ShieldAlert, Upload, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { downloadResponsibilityTermPdf } from "@/lib/responsibilityTermPdf";
import { CityOfOperationSelect, emptyCitySelection } from "@/components/CityOfOperationSelect";
import { citySelectionFromLabel, resolveCityOfOperation, type CitySelection } from "@shared/brazilPlaces";
import { decodeSpecialties, professionalSpecialties, bondLabel, type ProfessionalSpecialtyId } from "@shared/professionalSpecialties";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { AdminPage, EmptyAdmin } from "./_shared";

const teamRoles = {
  criador: { label: "Criador da Equipe Ojú", detail: "Só rascunho e mídia. Não publica no site." },
  editor: { label: "Editor da Equipe Ojú", detail: "Revisa texto e organização. Não publica no site." },
  aprovador: { label: "Aprovador da Equipe Ojú", detail: "Libera rascunho para aprovado. Ainda não coloca no ar." },
} as const;
const partnerRole = { label: "Criador parceiro", detail: "Vínculo de Rede. Especialidades ficam no perfil profissional. O papel de segurança (administrador) continua no grant e no termo gov.br." };

type TeamRole = keyof typeof teamRoles;
type Role = TeamRole | "administrador";

function roleMeta(role: Role) {
  return role === "administrador" ? partnerRole : teamRoles[role];
}

function isHomologPartner(partner: { displayName: string; slug: string }) {
  return /homolog/i.test(`${partner.displayName} ${partner.slug}`);
}

export default function CollaboratorsAdmin() {
  const utils = trpc.useUtils();
  const collaborators = trpc.collaborators.list.useQuery(undefined, { refetchInterval: 10000 });
  const partners = trpc.partners.list.useQuery();
  const openRequests = trpc.joinRequests.list.useQuery();
  const [role, setRole] = useState<TeamRole>("criador");
  const [city, setCity] = useState<CitySelection>(emptyCitySelection());
  const [emailPrefill, setEmailPrefill] = useState("");
  const [pedidoId, setPedidoId] = useState(0);
  const [specialties, setSpecialties] = useState<ProfessionalSpecialtyId[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    const pedido = Number(params.get("pedido") || 0);
    if (email) setEmailPrefill(email);
    if (pedido) setPedidoId(pedido);
  }, []);
  const candidate = (openRequests.data?.items || []).find(item => item.id === pedidoId) || (openRequests.data?.items || []).find(item => emailPrefill && item.email === emailPrefill);
  useEffect(() => {
    if (!candidate) return;
    setEmailPrefill(candidate.email);
    setCity(current => current.uf ? current : citySelectionFromLabel(candidate.territoryText));
    const decoded = decodeSpecialties(candidate.practice).map(item => item.id);
    setSpecialties(decoded.length ? decoded : []);
  }, [candidate?.id, candidate?.email, candidate?.territoryText]);
  const catalogPartners = (partners.data || []).filter(partner => !isHomologPartner(partner));
  const refresh = () => { utils.collaborators.list.invalidate(); utils.joinRequests.list.invalidate(); utils.partners.list.invalidate(); };
  const authorize = trpc.collaborators.authorize.useMutation({ onSuccess: () => { toast.success("Conta da Equipe Ojú autorizada. A pessoa entra com o mesmo e-mail Google."); refresh(); }, onError: error => toast.error(error.message) });
  const authorizePartner = trpc.collaborators.authorizePartnerCandidate.useMutation({ onSuccess: result => { toast.success(`Parceiro habilitado em ${result.city}. Depois anexe o termo gov.br.`); refresh(); }, onError: error => toast.error(error.message) });
  const update = trpc.collaborators.update.useMutation({ onSuccess: () => { toast.success("Permissão de colaborador atualizada."); refresh(); }, onError: error => toast.error(error.message) });
  const createTerm = trpc.collaborators.createResponsibilityTerm.useMutation({ onSuccess: result => { downloadResponsibilityTermPdf({ termId: result.id, administratorName: result.displayName, administratorEmail: result.email, note: result.grant.note }); toast.success("Termo exportado. Oriente a assinatura exclusivamente pelo gov.br."); refresh(); }, onError: error => toast.error(error.message) });
  const attachTerm = trpc.collaborators.attachSignedResponsibilityTerm.useMutation({ onSuccess: () => { toast.success("Termo assinado via gov.br anexado. O administrador foi ativado."); refresh(); }, onError: error => toast.error(error.message) });
  const setStatus = trpc.collaborators.setAccountStatus.useMutation({ onSuccess: result => { toast.success(`Conta ${result.adminId} atualizada. Sessões anteriores foram invalidadas.`); refresh(); }, onError: error => toast.error(error.message) });
  const uploadSignedTerm = async (event: React.ChangeEvent<HTMLInputElement>, termId?: number) => { const file = event.target.files?.[0]; if (!file) return; if (!termId) { toast.error("Exporte primeiro o termo de responsabilidade correspondente."); event.target.value = ""; return; } if (file.type !== "application/pdf") { toast.error("Anexe somente o PDF assinado pelo gov.br."); event.target.value = ""; return; } if (file.size > 16 * 1024 * 1024) { toast.error("O PDF assinado deve ter até 16 MB."); event.target.value = ""; return; } try { const response = await fetch("/api/media/upload", { method: "POST", headers: { "content-type": "application/pdf", "x-file-name": file.name }, body: file }); const uploaded = await response.json(); if (!response.ok) throw new Error(uploaded.message || "Não foi possível enviar o PDF."); attachTerm.mutate({ id: termId, signedDocumentUrl: uploaded.url, signedStorageKey: uploaded.key || null, signedFilename: uploaded.filename || file.name }); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível anexar o termo."); } finally { event.target.value = ""; } };

  return <AdminPage eyebrow="Governança de acesso" title="Colaboradores e permissões." action={<div className="flex flex-wrap gap-2"><Link href="/admin/denuncias" className="rounded-full border border-[#242017] px-4 py-2 text-sm font-bold">Denúncias</Link><Link href="/admin/candidaturas" className="rounded-full border border-[#242017] px-4 py-2 text-sm font-bold">Candidaturas públicas{openRequests.data?.open ? ` (${openRequests.data.open})` : ""}</Link></div>}>
    <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <form className="admin-card grid gap-4 p-6" onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (candidate) {
          if (!specialties.length) {
            toast.error("Marque ao menos uma especialidade. Isso não altera o papel de segurança.");
            return;
          }
          try {
            resolveCityOfOperation(city);
            authorizePartner.mutate({
              joinRequestId: candidate.id,
              displayName: String(data.get("displayName")) || candidate.name,
              note: String(data.get("note")) || null,
              place: { uf: city.uf, ibgeId: city.ibgeId === "" ? "outro" : city.ibgeId, customName: city.customName },
              specialties,
              hasOwnMedia: candidate.hasOwnMedia,
              networkBond: candidate.networkBond,
              mediaOutletName: candidate.mediaOutletName,
              mediaOutletUrl: candidate.mediaOutletUrl,
            });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Selecione estado e município, ou Outro.");
          }
          return;
        }
        authorize.mutate({ email: String(data.get("email")), displayName: String(data.get("displayName")) || null, role, note: String(data.get("note")) || null, partnerId: null, territoryId: null });
      }}>
        <div className="flex gap-3"><div className="rounded-xl bg-[#f6d978] p-3"><UserPlus className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">{candidate ? "Habilitar na Rede" : "Equipe Ojú"}</p><h2 className="mt-2 font-serif text-3xl">{candidate ? "Cidade, especialidade e vínculo." : "Liberar admin interno."}</h2><p className="mt-2 text-sm leading-6 text-oju-terra-suave">{candidate ? "Especialidade descreve o ofício. O papel criador/editor/aprovador/administrador continua no RBAC. Cidade continua no parceiro territorial." : "Criador, editor e aprovador são da Equipe Ojú — o site nacional. Não é candidatura a parceiro. Sem cidade e sem especialidade."}</p></div></div>
        {candidate ? (
          <>
            <p className="rounded-xl border border-[#d49b4c]/40 bg-[#fff6e8] p-4 text-sm leading-6 text-[#6b4a2b]"><b>{candidate.name}</b> pediu especialidade: {candidate.practice || "não informada"}. Vínculo: {bondLabel(candidate.networkBond)}. {candidate.hasOwnMedia ? `Já tem mídia: ${candidate.mediaOutletName || "informada"}.` : "Sem mídia própria declarada."} Cidade: {candidate.territoryText}.</p>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Especialidades do perfil profissional</legend>
              {professionalSpecialties.map(item => {
                const checked = specialties.includes(item.id);
                return (
                  <label key={item.id} className="grid gap-2 rounded-xl border border-oju-terra/10 bg-white px-3 py-3 text-sm">
                    <span className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1 accent-oju-verde" checked={checked} onChange={() => setSpecialties(current => current.includes(item.id) ? current.filter(value => value !== item.id) : [...current, item.id])} />
                      <span><b>{item.label}.</b> {item.summary}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <label className="grid gap-2 text-sm font-medium">Nome de referência<Input name="displayName" defaultValue={candidate.name} /></label>
            <label className="grid gap-2 text-sm font-medium">E-mail Google<Input required name="email" type="email" defaultValue={candidate.email} key={candidate.email} readOnly /></label>
            <CityOfOperationSelect required value={city} onChange={setCity} hint="Todas as cidades do Brasil. Se faltar na lista, use Outro." selectClassName="h-10 rounded border bg-white px-3" inputClassName="h-10 rounded border bg-white px-3" />
            <section className="rounded-xl border border-[#d49b4c]/40 bg-[#fff6e8] p-4 text-sm leading-6 text-[#6b4a2b]"><b>{partnerRole.label}:</b> {partnerRole.detail} Só publica ou aceita pedido depois do termo gov.br anexado.</section>
          </>
        ) : (
          <>
            <label className="grid gap-2 text-sm font-medium">Nome de referência (opcional)<Input name="displayName" placeholder="Como a pessoa será identificada na gestão" /></label>
            <label className="grid gap-2 text-sm font-medium">E-mail da conta Google<Input required name="email" type="email" defaultValue={emailPrefill} key={emailPrefill} placeholder="colaborador@gmail.com" /></label>
            <label className="grid gap-2 text-sm font-medium">Papel na Equipe Ojú<select value={role} onChange={event => setRole(event.target.value as TeamRole)} className="h-10 rounded border bg-white px-3">{Object.entries(teamRoles).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
            <section className="rounded-xl border border-[#d49b4c]/40 bg-[#fff6e8] p-4 text-sm leading-6 text-[#6b4a2b]"><b>{teamRoles[role].label}:</b> {teamRoles[role].detail}</section>
          </>
        )}
        <label className="grid gap-2 text-sm font-medium">Observação interna (opcional)<Textarea name="note" placeholder="Conversa, projeto ou responsável pela indicação." /></label>
        <p className="text-xs leading-5 text-oju-terra-suave">O e-mail comercial <b>ojumidia@gmail.com</b> é bloqueado. Parceiro entra por Candidaturas → Habilitar. Admin interno (Equipe Ojú) entra por esta tela, sem ofício de cidade.</p>
        <Button disabled={authorize.isPending || authorizePartner.isPending} className="bg-oju-verde text-oju-branco">{authorize.isPending || authorizePartner.isPending ? "Salvando..." : candidate ? "Habilitar parceiro nesta cidade" : "Autorizar equipe interna"}</Button>
      </form>
      <aside className="admin-card p-6"><div className="flex gap-3"><div className="rounded-xl bg-[#f1e6cc] p-3"><ShieldAlert className="h-5 w-5 text-[#806817]" /></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Regra de identidade</p><h2 className="mt-2 font-serif text-3xl">Contato não é permissão.</h2></div></div><div className="mt-6 grid gap-4 text-sm leading-6 text-oju-terra-suave"><p><b className="text-oju-terra">Equipe Ojú:</b> usa a conta Google principal e mantém a governança, os consolidados e a distribuição de carteiras.</p><p><b className="text-oju-terra">Colaboradores:</b> cada pessoa recebe uma conta Google própria, um papel individual e pode ser banida a qualquer momento. O pulso (produzindo, convite, parado) atualiza sozinho; a Equipe Ojú decide o banimento — não há corte automático.</p><p><b className="text-oju-terra">Público:</b> não acessa o Centro Administrativo.</p><p><b className="text-oju-terra">Canal comercial:</b> ojumidia@gmail.com continua público para dúvidas, sugestões e parcerias, sem qualquer privilégio de acesso.</p></div></aside>
    </section>
    <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Acessos existentes</p><h2 className="mt-2 font-serif text-3xl">Contas autorizadas individualmente.</h2></div><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Admin ID, e-mail, nome" className="max-w-sm" /></div>
      {collaborators.data?.superAdmins.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{collaborators.data.superAdmins.map(account => <article key={account.id} className="rounded-xl border border-[#806817]/30 bg-[#fff7e8] p-5"><div className="flex items-center gap-2 text-sm font-semibold text-[#6b4d2b]"><BadgeCheck className="h-4 w-4" />Equipe Ojú</div><p className="mt-3 font-serif text-2xl">{account.name || "Conta Google principal"}</p><p className="mt-1 text-sm font-mono text-oju-terra">{account.adminId}</p><p className="mt-1 text-sm text-oju-terra-suave">{account.email}</p></article>)}</div> : null}
      {collaborators.isLoading ? <p className="mt-6 text-sm text-oju-terra-suave">Carregando autorizações...</p> : collaborators.data?.grants.length ? <div className="mt-5 grid gap-4">{collaborators.data.grants.filter(grant => { const hay = `${grant.adminId || ""} ${grant.email} ${grant.displayName || ""} ${grant.account?.name || ""}`.toLowerCase(); return hay.includes(search.trim().toLowerCase()); }).map(grant => { const term = grant.responsibilityTerm; const requiresTerm = grant.role === "administrador"; const termSigned = term?.status === "Assinado via gov.br"; return <article key={grant.id} className={`admin-card p-5 ${grant.status === "Revogado" ? "opacity-70" : ""}`}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">{grant.status}{grant.account?.accountStatus ? ` · conta ${grant.account.accountStatus}` : ""}</p><h3 className="mt-2 font-serif text-2xl">{grant.displayName || grant.account?.name || "Colaborador autorizado"}</h3>{grant.adminId ? <p className="mt-1 font-mono text-sm text-oju-terra">{grant.adminId}</p> : <p className="mt-1 text-sm text-oju-terra-suave">Admin ID será gerado no primeiro login Google.</p>}<p className="mt-1 text-sm text-oju-terra-suave">{grant.email}</p></div><div className="text-right"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${grant.pulse.code === "produzindo" ? "bg-[#d6ead4] text-[#2f7040]" : grant.pulse.code === "fantasma" || grant.pulse.code === "convite" ? "bg-[#f5e5de] text-[#8b4d24]" : "bg-oju-papel text-oju-terra-suave"}`}>{grant.pulse.label}</span><p className="mt-2 text-[11px] text-oju-terra-suave">{grant.publicationCount} conteúdos · {grant.mediaCount} mídias</p></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Permissão<select value={grant.role} onChange={event => update.mutate({ id: grant.id, role: event.target.value as Role })} disabled={update.isPending || grant.status === "Revogado"} className="h-10 rounded border bg-white px-3">{Object.entries(teamRoles).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}<option value="administrador">{partnerRole.label}</option></select></label><label className="grid gap-2 text-sm font-medium">Parceiro e cidade<select value={grant.partnerId && grant.territoryId ? `${grant.partnerId}:${grant.territoryId}` : ""} onChange={event => { const [nextPartner, nextTerritory] = event.target.value.split(":"); update.mutate({ id: grant.id, partnerId: nextPartner ? Number(nextPartner) : null, territoryId: nextTerritory ? Number(nextTerritory) : null }); }} disabled={update.isPending || grant.status === "Revogado"} className="h-10 rounded border bg-white px-3"><option value="">Operação nacional</option>{catalogPartners.flatMap(partner => partner.territories.map(territory => <option key={`${partner.id}:${territory.id}`} value={`${partner.id}:${territory.id}`}>{partner.displayName} · {territory.name}</option>))}</select></label></div><div className="mt-3">{grant.status === "Autorizado" ? <Button variant="outline" onClick={() => { if (window.confirm(`Banir o acesso de ${grant.email}? A pessoa perde o painel. O conteúdo publicado permanece até você decidir.`)) update.mutate({ id: grant.id, status: "Revogado" }); }} disabled={update.isPending}>Banir acesso</Button> : <Button onClick={() => update.mutate({ id: grant.id, status: "Autorizado" })} disabled={update.isPending}>Restaurar acesso</Button>}</div>{grant.account ? <div className="mt-3 flex flex-wrap gap-2">{grant.account.accountStatus !== "Suspenso" ? <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => { const reason = window.prompt("Motivo da suspensão"); if (reason) setStatus.mutate({ userId: grant.account!.id, status: "Suspenso", reason }); }}>Suspender</Button> : null}{grant.account.accountStatus !== "Bloqueado" ? <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => { const reason = window.prompt("Motivo do bloqueio"); if (reason) setStatus.mutate({ userId: grant.account!.id, status: "Bloqueado", reason }); }}>Bloquear</Button> : null}{grant.account.accountStatus !== "Ativo" ? <Button size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ userId: grant.account!.id, status: "Ativo", reason: "Reativação explícita pelo Super Admin." })}>Reativar</Button> : null}{grant.account.accountStatus !== "Revogado" ? <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => { const reason = window.prompt("Motivo da revogação (não apaga histórico)"); if (reason) setStatus.mutate({ userId: grant.account!.id, status: "Revogado", reason }); }}>Revogar</Button> : null}</div> : null}<p className="mt-3 text-xs leading-5 text-oju-terra-suave">{roleMeta(grant.role).detail}{grant.note ? ` Observação: ${grant.note}` : ""}</p>{grant.professional ? <p className="mt-2 text-xs leading-5 text-oju-terra-suave">Perfil profissional: {grant.professional.specialties.map(item => item.label).join(" · ") || "sem especialidade"} · {bondLabel(grant.professional.networkBond)}{grant.professional.hasOwnMedia ? ` · mídia ${grant.professional.mediaOutletName || "própria"}` : ""} · território no grant {grant.territoryId ? "associado" : "não definido"}.</p> : null}{requiresTerm ? <section className="mt-5 rounded-xl border border-[#d49b4c]/35 bg-[#fff8ea] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">Termo de responsabilidade</p><p className="mt-1 text-sm text-oju-terra-suave">{termSigned ? "Assinado via gov.br — acesso administrativo ativado." : term ? `${term.status} — a conta permanece como criador até o anexo do PDF assinado.` : "Sem termo gerado — a conta não recebe acesso administrativo."}</p></div><FileSignature className="h-5 w-5 text-[#806817]" /></div><div className="mt-4 flex flex-wrap gap-3"><Button type="button" size="sm" className="bg-oju-verde text-oju-branco" disabled={createTerm.isPending || grant.status !== "Autorizado"} onClick={() => createTerm.mutate({ grantId: grant.id })}><FileDown className="mr-2 h-4 w-4" />{createTerm.isPending ? "Gerando..." : "Exportar termo em PDF"}</Button>{!termSigned ? <label className="inline-flex cursor-pointer items-center rounded-md border border-[#242017] px-3 py-2 text-sm font-medium text-oju-terra"><Upload className="mr-2 h-4 w-4" />Anexar PDF assinado via gov.br<input className="sr-only" type="file" accept="application/pdf" onChange={event => uploadSignedTerm(event, term?.id)} /></label> : null}{term?.hasSignedDocument ? <a href={`/api/governance/administrator-responsibility-terms/${term.id}/document`} target="_blank" rel="noreferrer" className="inline-flex items-center px-2 text-sm font-bold text-[#806817] underline">Abrir PDF assinado</a> : null}</div></section> : null}</article>; })}</div> : <EmptyAdmin text="Nenhum colaborador foi autorizado ainda. Adicione uma conta Google acima para iniciar a gestão individual." />}
    </section>
  </AdminPage>;
}
