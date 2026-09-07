import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";
import { Button } from "@/components/ui/button";

const nextStatus = ["Recebida", "Em conversa", "Aprovada", "Recusada", "Arquivada"] as const;

export default function JoinRequestsAdmin() {
  const utils = trpc.useUtils();
  const list = trpc.joinRequests.list.useQuery(undefined, { refetchInterval: 8000 });
  const review = trpc.joinRequests.review.useMutation({
    onSuccess: () => { toast.success("Candidatura atualizada."); utils.joinRequests.list.invalidate(); },
    onError: error => toast.error(error.message),
  });

  return (
    <AdminPage eyebrow="Rede" title="Candidaturas a Parceiro Ojú.">
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-oju-terra-suave">
        Pedidos do site público. Especialidade e vínculo vêm no pedido (dados antigos em practice continuam legíveis). Habilitar grava o perfil profissional sem mudar o papel de Super Admin.
      </p>
      {list.isLoading ? <p className="text-sm text-oju-terra-suave">Carregando candidaturas...</p> : list.data?.items.length ? (
        <div className="grid gap-4">
          {list.data.items.map(item => (
            <article key={item.id} className="admin-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.12em] text-[#806817]">{item.status} · {item.bondLabel}</p>
                  <h2 className="mt-2 font-serif text-2xl">{item.name}</h2>
                  <p className="mt-1 text-sm text-oju-terra-suave">{item.email} · {item.whatsapp} · {item.territoryText}</p>
                </div>
                <p className="text-xs text-oju-terra-suave">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
              </div>
              {item.specialties.length ? (
                <p className="mt-3 text-sm text-[#393328]">Especialidades: {item.specialties.map(specialty => specialty.label).join(" · ")}</p>
              ) : (
                <p className="mt-3 text-sm text-oju-terra-suave">Practice legado ainda não mapeado: {item.practice}</p>
              )}
              {item.hasOwnMedia ? <p className="mt-1 text-sm text-[#393328]">Já tem mídia: {item.mediaOutletName || "informada"}{item.mediaOutletUrl ? ` · ${item.mediaOutletUrl}` : ""}</p> : null}
              {item.practice ? <p className="mt-1 text-xs text-oju-terra-suave">Registro original (practice): {item.practice}</p> : null}
              <p className="mt-4 text-sm leading-6 text-[#393328]">{item.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {nextStatus.filter(status => status !== item.status).map(status => (
                  <Button key={status} type="button" size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: item.id, status })}>{status}</Button>
                ))}
                {item.status !== "Recusada" && item.status !== "Arquivada" ? (
                  <Button asChild size="sm" className="bg-oju-verde text-oju-branco"><Link href={`/admin/colaboradores?pedido=${item.id}`}>Habilitar no painel</Link></Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyAdmin text="Nenhum pedido pelo canal público ainda." />}
    </AdminPage>
  );
}
