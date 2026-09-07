import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { AdminPage, EmptyAdmin } from "./_shared";

const labels: Record<string, string> = {
  opportunity_invite: "Novo convite operacional",
  opportunity_invite_expiring: "Convite encerrado por prazo",
  opportunity_invite_accepted: "Convite aceito",
  opportunity_invite_declined: "Convite recusado",
  opportunity_cancelled: "Oportunidade cancelada",
  production_created: "Produção criada",
  production_started: "Produção iniciada",
  production_media_review: "Mídia aguardando revisão",
  production_review_requested: "Revisão solicitada",
  production_completed: "Produção concluída",
  payment_available: "Pagamento disponível para registro",
  payment_confirmed: "Pagamento confirmado",
  delivery_completed: "Entrega ao cliente registrada",
  professional_service_request: "Pedido de serviço no seu perfil da Rede",
  professional_origination_submitted: "Sua originação foi registrada para análise",
};

export default function NetworkNotificationsAdmin() {
  const utils = trpc.useUtils();
  const mine = trpc.networkNotifications.mine.useQuery();
  const prefs = trpc.networkNotifications.preferences.useQuery();
  const mark = trpc.networkNotifications.markRead.useMutation({
    onSuccess: () => { utils.networkNotifications.mine.invalidate(); toast.success("Lida."); },
    onError: error => toast.error(error.message),
  });
  const save = trpc.networkNotifications.savePreferences.useMutation({
    onSuccess: () => { utils.networkNotifications.preferences.invalidate(); toast.success("Preferências salvas. Sem newsletter."); },
    onError: error => toast.error(error.message),
  });

  return (
    <AdminPage eyebrow="Rede Ojú" title="Notificações operacionais.">
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-oju-terra-suave">
        Inbox interna. Não é feed, chat nem rede social. Cada item aponta para oportunidade, produção ou encerramento — os valores continuam na entidade.
      </p>
      <form className="admin-card mb-6 flex flex-wrap items-center gap-4 p-4" onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        save.mutate({ inApp: data.get("inApp") === "on", emailTransactional: data.get("emailTransactional") === "on" });
      }}>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="inApp" defaultChecked={prefs.data?.inApp !== false} />Notificações internas</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="emailTransactional" defaultChecked={Boolean(prefs.data?.emailTransactional)} />E-mail transacional (sem marketing)</label>
        <Button size="sm" variant="outline" disabled={save.isPending}>Salvar preferências</Button>
      </form>
      {mine.data?.length ? mine.data.map(item => (
        <article key={item.id} className="admin-card mb-2 flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold">{labels[item.type] || item.type}</p>
            <p className="text-sm text-oju-terra-suave">{item.referenceType} #{item.referenceId}{item.readAt ? " · lida" : ""}</p>
          </div>
          {!item.readAt ? <Button size="sm" variant="outline" disabled={mark.isPending} onClick={() => mark.mutate({ id: item.id })}>Marcar lida</Button> : null}
        </article>
      )) : <EmptyAdmin text="Nenhuma notificação neste perfil." />}
    </AdminPage>
  );
}
