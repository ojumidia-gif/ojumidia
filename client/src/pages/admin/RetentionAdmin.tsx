import { TimerReset, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";

export default function RetentionAdmin() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const overview = trpc.media.retentionOverview.useQuery(undefined, { enabled: principal });
  const utils = trpc.useUtils();
  const cleanup = trpc.media.cleanupAbandonedUploads.useMutation({
    onSuccess: result => {
      toast.success(result.failed.length ? `Limpeza parcial: ${result.cleanedUploadSessionIds.length} sessão(ões); ${result.failed.length} falha(s) de storage.` : "Sessões abandonadas limpas.");
      utils.media.retentionOverview.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  if (!principal) {
    return <AdminPage eyebrow="Governança" title="Retenção e limpeza"><p className="text-sm text-[#655e52]">Somente a Equipe Ojú administra retenção técnica. Isso não substitui a Lixeira de mídia.</p></AdminPage>;
  }

  const data = overview.data;
  return (
    <AdminPage eyebrow="Governança" title="Retenção e limpeza">
      <section className="mb-7 grid gap-4 border border-[#242017]/10 bg-white/40 p-5">
        <div className="flex items-start gap-3">
          <div className="w-fit rounded-full bg-[#242017] p-3 text-white"><TimerReset className="h-5 w-5" /></div>
          <div>
            <h2 className="font-serif text-2xl">Artefatos técnicos, não segunda lixeira.</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#655e52]">Mídia do Acervo só some com Excluir definitivamente na Lixeira de mídia. Aqui a Equipe Ojú limpa sessões abandonadas e arquivos técnicos gerados pelo sistema que não viraram Acervo. PDFs de termos nascem no navegador. A Auditoria não se apaga.</p>
            <p className="mt-3 text-sm"><Link href="/admin/lixeira-midias" className="underline">Abrir Lixeira de mídia</Link></p>
          </div>
        </div>
      </section>
      {overview.isLoading ? <p>Carregando panorama...</p> : data ? (
        <>
          <section className="mb-6 grid gap-3 md:grid-cols-4">
            <article className="admin-card p-4"><p className="text-xs uppercase tracking-[.12em] text-[#655e52]">Acervo ativo</p><p className="mt-2 font-serif text-3xl">{data.occupancy.activeCount}</p></article>
            <article className="admin-card p-4"><p className="text-xs uppercase tracking-[.12em] text-[#655e52]">Lixeira de mídia</p><p className="mt-2 font-serif text-3xl">{data.occupancy.trashCount}</p></article>
            <article className="admin-card p-4"><p className="text-xs uppercase tracking-[.12em] text-[#655e52]">Upload sessions</p><p className="mt-2 font-serif text-3xl">{data.occupancy.uploadSessionCount}</p></article>
            <article className="admin-card p-4"><p className="text-xs uppercase tracking-[.12em] text-[#655e52]">Bytes registrados</p><p className="mt-2 font-serif text-3xl">{data.occupancy.recordedBytes}</p></article>
          </section>
          <section className="admin-card mb-6 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-serif text-xl">Sessões abandonadas</h3>
              <Button size="sm" onClick={() => cleanup.mutate({})} disabled={cleanup.isPending || data.abandonedUploads.length === 0}>Limpar expirados</Button>
            </div>
            <p className="mt-2 text-sm text-[#655e52]">Incompletas após 24h; prontas sem mídia no Acervo após 7 dias. Não apaga mídia da Lixeira.</p>
            {data.abandonedUploads.length ? (
              <ul className="mt-4 grid gap-2 text-sm">
                {data.abandonedUploads.map(session => (
                  <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#242017]/10 py-3">
                    <span>{session.filename} · {session.status} · {session.klass}</span>
                    <Button size="sm" variant="outline" onClick={() => cleanup.mutate({ uploadId: session.id })} disabled={cleanup.isPending}><Trash2 className="mr-1 h-3.5 w-3.5" />Limpar</Button>
                  </li>
                ))}
              </ul>
            ) : <div className="mt-4"><EmptyAdmin text="Nenhuma sessão abandonada no prazo da política." /></div>}
          </section>
          <section className="admin-card mb-6 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-serif text-xl">Arquivos técnicos gerados pelo sistema</h3>
              <Button size="sm" onClick={() => cleanup.mutate({ force: true })} disabled={cleanup.isPending || !data.technicalUploads.length}>Limpar todos sem mídia no Acervo</Button>
            </div>
            <p className="mt-2 text-sm text-[#655e52]">Uploads que o sistema criou e que não viraram mídia do Acervo. Não apaga fotos já publicadas nem a Lixeira. Mídias do Acervo continuam só na Lixeira de mídia.</p>
            {data.technicalUploads.length ? (
              <ul className="mt-4 grid gap-2 text-sm">
                {data.technicalUploads.map(session => (
                  <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#242017]/10 py-3">
                    <span>{session.filename || "arquivo técnico"} · {session.status}</span>
                    <Button size="sm" variant="outline" onClick={() => cleanup.mutate({ uploadId: session.id, force: true })} disabled={cleanup.isPending}><Trash2 className="mr-1 h-3.5 w-3.5" />Apagar</Button>
                  </li>
                ))}
              </ul>
            ) : <div className="mt-4"><EmptyAdmin text="Não há arquivos técnicos órfãos para apagar." /></div>}
          </section>
          <section className="admin-card p-5">
            <h3 className="font-serif text-xl">Arquivos gerados pelo sistema</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#eee9dc] text-[11px] uppercase tracking-[.12em] text-[#655e52]"><tr><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Onde</th><th className="px-4 py-2">Tigris</th><th className="px-4 py-2">Nota</th></tr></thead>
                <tbody>
                  {data.artifacts.map(item => (
                    <tr key={item.kind} className="border-t border-[#242017]/8">
                      <td className="px-4 py-3 font-medium">{item.kind}</td>
                      <td className="px-4 py-3 text-[#655e52]">{item.storedAt}</td>
                      <td className="px-4 py-3">{item.accumulatesInTigris ? "Sim" : "Não"}</td>
                      <td className="px-4 py-3 text-[#655e52]">{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </AdminPage>
  );
}
