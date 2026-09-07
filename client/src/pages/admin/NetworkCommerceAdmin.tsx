import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AdminPage, EmptyAdmin } from "./_shared";
import { PRODUCTION_MINICLIP_CAP, PRODUCTION_PHOTO_CAP } from "@shared/networkProductions";

function money(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function NetworkCommerceAdmin() {
  const { user } = useAuth();
  const canOperate = user?.role === "administrador" || user?.role === "administrador principal";
  const utils = trpc.useUtils();
  const list = trpc.productions.list.useQuery(undefined, { enabled: canOperate });
  const settlements = trpc.productions.settlements.useQuery(undefined, { enabled: canOperate });
  const open = trpc.productions.openSettlement.useMutation({
    onSuccess: () => { toast.success("Snapshot congelado copiado. A Opportunity não mudou."); utils.productions.settlements.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const pay = trpc.productions.setPaymentStatus.useMutation({
    onSuccess: () => { toast.success("Estado operacional atualizado. Pago só chega pelo webhook."); utils.productions.settlements.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const charge = trpc.networkDirectory.createPayment.useMutation({
    onSuccess: () => { toast.success("Cobrança Pix iniciada com o valor congelado. O navegador não confirma pagamento."); utils.productions.settlements.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const deliver = trpc.productions.markDelivered.useMutation({
    onSuccess: result => { toast.success(result.published ? "Entrega registrada." : "Entrega ao cliente registrada. Nada foi publicado na Rede."); utils.productions.list.invalidate(); utils.productions.settlements.invalidate(); },
    onError: error => toast.error(error.message),
  });

  if (!canOperate) {
    return <AdminPage eyebrow="Rede Ojú" title="Comercial e entregas."><p className="text-sm text-oju-terra-suave">Área operacional da administração territorial. Especialidade não abre este painel.</p></AdminPage>;
  }

  const concluded = (list.data || []).filter(item => item.status === "Concluída");

  return (
    <AdminPage eyebrow="Rede Ojú" title="Comercial e entregas operacionais.">
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-oju-terra-suave">
        Encerramento da produção aceita. Não é marketplace, galeria Lightroom nem publicação automática. A janela pública continua {PRODUCTION_PHOTO_CAP} JPG + {PRODUCTION_MINICLIP_CAP} miniclip. Entrega ao cliente ≠ publicação na Rede.
      </p>
      <section className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Produções concluídas</p>
        {concluded.length ? concluded.map(item => (
          <article key={item.id} className="admin-card mt-2 flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-oju-terra-suave">Território #{item.territoryId} · {item.deliveredAt ? "entrega registrada" : "entrega pendente"} · editorialReady {String(item.editorialReady)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={open.isPending} onClick={() => open.mutate({ productionId: item.id })}>Abrir comercial</Button>
              <Button size="sm" variant="outline" disabled={charge.isPending} onClick={() => charge.mutate({ productionId: item.id })}>Gerar Pix</Button>
              <Button size="sm" variant="outline" disabled={deliver.isPending} onClick={() => deliver.mutate({ id: item.id })}>Registrar entrega</Button>
            </div>
          </article>
        )) : <EmptyAdmin text="Nenhuma produção concluída neste escopo." />}
      </section>
      <section>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Estados operacionais (Pago só pelo webhook)</p>
        {settlements.data?.length ? settlements.data.map(item => (
          <article key={item.id} className="admin-card mt-2 p-4">
            <p className="font-semibold">{item.title || `Produção #${item.productionId}`}</p>
            <p className="mt-1 text-sm">Total {money(item.totalValue)} · profissional {money(item.professionalValue)} · Ojú {money(item.ojuValue)} · fundo {money(item.networkFundValue)} · política #{item.commercialPolicyId} v{item.commercialPolicyVersion}</p>
            <p className="mt-1 text-sm text-oju-terra-suave">{item.paymentStatus} · Opportunity #{item.opportunityId} congelada</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["Pagamento cancelado", "Reembolso", "Encerrado"] as const).map(status => (
                <Button key={status} size="sm" variant="outline" disabled={pay.isPending || item.paymentStatus === status} onClick={() => pay.mutate({ productionId: item.productionId, paymentStatus: status })}>{status}</Button>
              ))}
            </div>
          </article>
        )) : <p className="mt-2 text-sm text-oju-terra-suave">Nenhum encerramento aberto.</p>}
      </section>
    </AdminPage>
  );
}
