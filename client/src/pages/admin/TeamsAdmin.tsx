import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AdminPage, EmptyAdmin } from "./_shared";

export default function TeamsAdmin() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const utils = trpc.useUtils();
  const { data: teams } = trpc.editorial.teams.useQuery(undefined, { refetchInterval: 5000 });
  const { data: users } = trpc.media.users.useQuery(undefined, { enabled: principal, refetchInterval: 5000 });
  const [name, setName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const refresh = () => utils.editorial.teams.invalidate();
  const create = trpc.editorial.createTeam.useMutation({
    onSuccess: result => {
      toast.success(result.reused ? "Esta equipe já existia. Reaproveitamos o crédito." : "Equipe criada.");
      setName("");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const archive = trpc.editorial.archiveTeam.useMutation({ onSuccess: () => { toast.success("Equipe arquivada. Matérias antigas preservam o crédito."); refresh(); }, onError: error => toast.error(error.message) });
  const restore = trpc.editorial.restoreTeam.useMutation({ onSuccess: () => { toast.success("Equipe restaurada."); refresh(); }, onError: error => toast.error(error.message) });
  const remove = trpc.editorial.removeTeam.useMutation({ onSuccess: () => { toast.success("Equipe excluída."); refresh(); }, onError: error => toast.error(error.message) });
  const merge = trpc.editorial.mergeDuplicateTeams.useMutation({
    onSuccess: result => {
      toast.success(result.archived ? `${result.archived} duplicata(s) unificada(s).` : "Não havia duplicatas com o mesmo nome.");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const active = teams?.filter(item => !item.archivedAt) || [];
  const archived = teams?.filter(item => item.archivedAt) || [];

  return (
    <AdminPage eyebrow="Equipes e créditos" title="Pessoas, papéis e cobertura.">
      <p className="mb-6 max-w-3xl text-sm leading-6 text-[#655e52]">
        Crédito de matéria reaproveita o mesmo nome. Arquivar tira a equipe da lista sem apagar o histórico. Excluir só vale se nenhuma matéria usa o crédito.
        {principal ? " Unificar duplicatas junta o mesmo nome na equipe mais antiga." : " Você vê as equipes que criou ou que já usa nas suas matérias."}
      </p>
      <div className={`grid gap-6 ${principal ? "xl:grid-cols-[.8fr_1.2fr]" : ""}`}>
        <section className="admin-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-serif text-2xl">Equipes responsáveis</p>
            {principal ? (
              <Button type="button" size="sm" variant="outline" disabled={merge.isPending} onClick={() => merge.mutate()}>
                Unificar duplicatas
              </Button>
            ) : null}
          </div>
          <form className="mt-5 flex gap-2" onSubmit={event => { event.preventDefault(); create.mutate({ name }); }}>
            <Input required minLength={2} value={name} onChange={event => setName(event.target.value)} placeholder="Nome da equipe" />
            <Button disabled={create.isPending} className="bg-[#242017] text-white">Criar</Button>
          </form>
          <div className="mt-6 grid gap-2">
            {active.length ? active.map(team => (
              <div key={team.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#eee9dc] px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{team.name}</p>
                  <p className="mt-1 text-[11px] text-[#655e52]">{team.usageCount ? `${team.usageCount} matéria(s)` : "Sem matérias ainda"}</p>
                </div>
                <div className="flex gap-2">
                  {principal || team.createdBy === user?.id ? (
                    <>
                      <Button type="button" size="sm" variant="outline" onClick={() => archive.mutate({ id: team.id })}>Arquivar</Button>
                      {team.usageCount === 0 ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => { if (window.confirm(`Excluir “${team.name}”?`)) remove.mutate({ id: team.id }); }}>Excluir</Button>
                      ) : null}
                    </>
                  ) : <p className="text-[11px] text-[#806817]">Crédito em uso nas suas matérias</p>}
                </div>
              </div>
            )) : <p className="text-sm text-[#655e52]">Nenhuma equipe ativa.</p>}
          </div>
          {principal && archived.length ? (
            <div className="mt-6 border-t border-[#242017]/10 pt-4">
              <button type="button" className="text-sm font-semibold text-[#806817]" onClick={() => setShowArchived(value => !value)}>
                {showArchived ? "Ocultar arquivo" : `Ver arquivo (${archived.length})`}
              </button>
              {showArchived ? (
                <div className="mt-3 grid gap-2">
                  {archived.map(team => (
                    <div key={team.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#242017]/20 px-4 py-3">
                      <p className="text-sm text-[#655e52]">{team.name}</p>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => restore.mutate({ id: team.id })}>Restaurar</Button>
                        {team.usageCount === 0 ? (
                          <Button type="button" size="sm" variant="ghost" onClick={() => { if (window.confirm(`Excluir “${team.name}” do arquivo?`)) remove.mutate({ id: team.id }); }}>Excluir</Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
        {principal ? (
          <section className="admin-card overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#242017]/10 px-6 py-5">
              <div>
                <p className="font-serif text-2xl">Quem entra no painel</p>
                <p className="mt-1 text-sm text-[#655e52]">Papel administrativo só muda em Colaboradores, com termo via gov.br.</p>
              </div>
              <Link href="/admin/colaboradores" className="inline-flex h-9 items-center rounded-md bg-[#242017] px-3 text-sm font-medium text-white">Gerenciar colaboradores</Link>
            </div>
            {users?.length ? (
              <div>
                {users.map(person => (
                  <div key={person.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242017]/7 px-6 py-4">
                    <div>
                      <p className="font-medium">{person.name || person.email || "Membro da equipe"}</p>
                      <p className="mt-1 text-xs text-[#655e52]">{person.email}</p>
                    </div>
                    <span className="rounded-full bg-[#eee9dc] px-3 py-1 text-sm capitalize">{person.role}</span>
                  </div>
                ))}
              </div>
            ) : <div className="p-6"><EmptyAdmin text="Os membros aparecem aqui após o login autorizado." /></div>}
          </section>
        ) : null}
      </div>
    </AdminPage>
  );
}
