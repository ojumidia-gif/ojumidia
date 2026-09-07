import { useState } from "react";
import { ScrollText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { labelAuditAction } from "@shared/auditView";
import { AdminPage, EmptyAdmin } from "./_shared";
import { Button } from "@/components/ui/button";

export default function AuditAdmin() {
  const [view, setView] = useState<"operacao" | "completa">("operacao");
  const [offset, setOffset] = useState(0);
  const log = trpc.operations.auditLog.useQuery({ limit: 40, offset, view }, { refetchInterval: 15000 });
  return (
    <AdminPage eyebrow="Governança" title="Auditoria administrativa.">
      <section className="admin-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-xl bg-[#f6d978] p-3"><ScrollText className="h-5 w-5" /></div>
            <div>
              <p className="font-serif text-2xl">Quem fez o quê, e quando.</p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-oju-terra-suave">
                A trilha não se apaga. A visão Operação esconde login, upload técnico e tentativas de expurgo. Completa mostra o registro inteiro. Senhas e tokens nunca entram aqui.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={view === "operacao" ? "default" : "outline"} className={view === "operacao" ? "bg-oju-verde text-oju-branco" : ""} onClick={() => { setView("operacao"); setOffset(0); }}>Operação</Button>
            <Button type="button" size="sm" variant={view === "completa" ? "default" : "outline"} className={view === "completa" ? "bg-oju-verde text-oju-branco" : ""} onClick={() => { setView("completa"); setOffset(0); }}>Trilha completa</Button>
          </div>
        </div>
      </section>
      {log.isLoading ? <p className="mt-6 text-sm text-oju-terra-suave">Carregando eventos...</p> : log.data?.length ? (
        <div className="mt-6 overflow-x-auto admin-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-oju-papel text-[11px] uppercase tracking-[.12em] text-oju-terra-suave">
              <tr>
                <th className="px-5 py-3">Quando</th>
                <th className="px-5 py-3">Ação</th>
                <th className="px-5 py-3">Recurso</th>
                <th className="px-5 py-3">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {log.data.map(event => (
                <tr key={event.id} className="border-t border-oju-terra/10">
                  <td className="px-5 py-3 whitespace-nowrap">{new Date(event.createdAt).toLocaleString("pt-BR")}</td>
                  <td className="px-5 py-3 font-medium">{labelAuditAction(event.action)}</td>
                  <td className="px-5 py-3 text-oju-terra-suave">{event.resourceType}{event.resourceId ? ` #${event.resourceId}` : ""}</td>
                  <td className="px-5 py-3 text-oju-terra-suave">{event.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between gap-3 px-5 py-4">
            <Button type="button" size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - 40))}>Anteriores</Button>
            <Button type="button" size="sm" variant="outline" disabled={(log.data?.length || 0) < 40} onClick={() => setOffset(value => value + 40)}>Próximos</Button>
          </div>
        </div>
      ) : <div className="mt-6"><EmptyAdmin text={offset ? "Não há mais eventos nesta página." : "Ainda não há eventos nesta visão."} /></div>}
    </AdminPage>
  );
}
