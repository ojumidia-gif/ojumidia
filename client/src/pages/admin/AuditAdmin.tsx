import { ScrollText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";

export default function AuditAdmin() {
  const log = trpc.operations.auditLog.useQuery({ limit: 80 });
  return (
    <AdminPage eyebrow="Governança" title="Auditoria administrativa.">
      <section className="admin-card p-6">
        <div className="flex gap-3">
          <div className="rounded-xl bg-[#f6d978] p-3"><ScrollText className="h-5 w-5" /></div>
          <div>
            <p className="font-serif text-2xl">Quem fez o quê, e quando.</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#655e52]">Logins, grants, publicação, território e políticas comerciais. Senhas e tokens nunca entram neste registro.</p>
          </div>
        </div>
      </section>
      {log.isLoading ? <p className="mt-6 text-sm text-[#655e52]">Carregando eventos...</p> : log.data?.length ? (
        <div className="mt-6 overflow-x-auto admin-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#eee9dc] text-[11px] uppercase tracking-[.12em] text-[#655e52]">
              <tr>
                <th className="px-5 py-3">Quando</th>
                <th className="px-5 py-3">Ação</th>
                <th className="px-5 py-3">Recurso</th>
                <th className="px-5 py-3">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {log.data.map(event => (
                <tr key={event.id} className="border-t border-[#242017]/8">
                  <td className="px-5 py-3 whitespace-nowrap">{new Date(event.createdAt).toLocaleString("pt-BR")}</td>
                  <td className="px-5 py-3 font-medium">{event.action}</td>
                  <td className="px-5 py-3 text-[#655e52]">{event.resourceType}{event.resourceId ? ` #${event.resourceId}` : ""}</td>
                  <td className="px-5 py-3 text-[#655e52]">{event.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="mt-6"><EmptyAdmin text="Ainda não há eventos administrativos registrados neste ambiente." /></div>}
    </AdminPage>
  );
}
