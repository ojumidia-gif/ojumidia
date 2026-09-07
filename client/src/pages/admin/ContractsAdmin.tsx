import { Button } from "@/components/ui/button";
import { FileSignature, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";

const statusStyles: Record<string, string> = { Rascunho: "bg-oju-papel text-oju-terra-suave", Enviado: "bg-[#e1eff3] text-[#1f5f72]", Assinado: "bg-[#e6f2e5] text-[#496b3b]", Arquivado: "bg-oju-papel text-oju-terra-suave" };

export default function ContractsAdmin() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.commercial.listCoverageContracts.useQuery(undefined, { refetchInterval: 5000 });
  const discard = trpc.commercial.discardDraftCoverageContract.useMutation({
    onSuccess: () => {
      toast.success("Rascunho excluído definitivamente.");
      utils.commercial.listCoverageContracts.invalidate();
      utils.operations.overview.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  return (
    <AdminPage eyebrow="Contratos" title="Divulgação institucional documentada." action={null}>
      <section className="admin-card p-6">
        <div className="flex gap-3">
          <div className="rounded-xl bg-[#f6d978] p-3"><FileSignature className="h-5 w-5" /></div>
          <div>
            <p className="font-serif text-2xl">Contratos de divulgação</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-oju-terra-suave">Cada contrato permanece no Centro Administrativo, vinculado à sua Cobertura institucional. Nenhum documento é exibido no portal público. Rascunho ainda não enviado pode ser excluído de vez — sem lixeira.</p>
          </div>
        </div>
        {isLoading ? <p className="mt-6 text-sm">Carregando contratos...</p> : data?.length ? (
          <div className="mt-6 divide-y divide-[#242017]/10">
            {data.map(contract => (
              <article className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center" key={contract.id}>
                <div>
                  <p className="font-medium">{contract.contractor}</p>
                  <p className="mt-1 text-xs text-oju-terra-suave">Cobertura #{contract.publicationId} · criado em {new Date(contract.createdAt).toLocaleDateString("pt-BR")}</p>
                  <p className="mt-2 break-all text-xs text-[#806817]">{contract.documentUrl}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[contract.status]}`}>{contract.status}</span>
                  {contract.publicationId ? <Button asChild size="sm" variant="outline"><Link href={`/admin/editar/${contract.publicationId}`}>Abrir Cobertura</Link></Button> : null}
                  {contract.status === "Rascunho" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#8b4d24] text-[#8b4d24]"
                      disabled={discard.isPending}
                      onClick={() => {
                        if (window.confirm(`Excluir definitivamente o rascunho “${contract.contractor}”? Isto não passa pela lixeira.`)) discard.mutate({ id: contract.id });
                      }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />Excluir rascunho
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : <div className="mt-6"><EmptyAdmin text="Os contratos surgem quando uma Cobertura institucional é vinculada a uma solicitação contratada." /></div>}
      </section>
    </AdminPage>
  );
}
