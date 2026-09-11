import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminPage } from "./_shared";
import { PRODUCTION_MINICLIP_CAP, PRODUCTION_MINICLIP_SECONDS, PRODUCTION_PHOTO_CAP } from "@shared/networkProductions";
import { mediaReadyToLinkProduction } from "@shared/acervoFlow";

const buckets = [
  ["planejadas", "Planejadas"],
  ["confirmadas", "Confirmadas"],
  ["emProducao", "Em produção"],
  ["aguardandoMidia", "Aguardando mídia"],
  ["concluidas", "Concluídas"],
] as const;

export default function ProductionsAdmin() {
  const { user } = useAuth();
  const canReview = user?.role === "administrador" || user?.role === "administrador principal";
  const utils = trpc.useUtils();
  const mine = trpc.productions.mine.useQuery();
  const [openId, setOpenId] = useState<number | null>(null);
  const detail = trpc.productions.get.useQuery({ id: openId || 0 }, { enabled: Boolean(openId) });
  const transition = trpc.productions.transition.useMutation({
    onSuccess: () => { toast.success("Produção atualizada."); utils.productions.mine.invalidate(); if (openId) utils.productions.get.invalidate({ id: openId }); },
    onError: error => toast.error(error.message),
  });
  const attach = trpc.productions.attachMedia.useMutation({
    onSuccess: result => { toast.success(result.publicationAllowed ? "Mídia ligada. Continua dependente de autorização para o portal." : "Mídia ligada. Continua privada."); if (openId) utils.productions.get.invalidate({ id: openId }); },
    onError: error => toast.error(error.message),
  });
  const submit = trpc.productions.submitForReview.useMutation({
    onSuccess: () => { toast.success("Enviada para revisão. Nada foi publicado."); if (openId) utils.productions.get.invalidate({ id: openId }); utils.productions.mine.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const approve = trpc.productions.approveReview.useMutation({
    onSuccess: result => { toast.success(result.editorialReady ? "Concluída e apta à curadoria. Ainda não está no portal." : "Concluída. Autorização ainda impede publicação."); utils.productions.mine.invalidate(); if (openId) utils.productions.get.invalidate({ id: openId }); },
    onError: error => toast.error(error.message),
  });

  return (
    <AdminPage eyebrow="Rede Ojú" title="Minhas produções.">
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-oju-terra-suave">
        Área operacional privada. Não é portfólio. A janela da Rede é de no máximo {PRODUCTION_PHOTO_CAP} fotografias JPG e {PRODUCTION_MINICLIP_CAP} miniclip de até {PRODUCTION_MINICLIP_SECONDS} segundos. O acervo completo permanece fora do Ojú.
      </p>
      {buckets.map(([key, label]) => (
        <section key={key} className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">{label}</p>
          {(mine.data?.buckets[key] || []).length ? mine.data!.buckets[key].map(item => (
            <article key={item.id} className="admin-card mt-2 p-4">
              <button type="button" className="text-left" onClick={() => setOpenId(item.id)}>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-oju-terra-suave">{item.status} · {item.workType} · território #{item.territoryId}</p>
              </button>
            </article>
          )) : <p className="mt-2 text-sm text-oju-terra-suave">Nenhuma.</p>}
        </section>
      ))}
      {detail.data ? (
        <section className="admin-card p-5">
          <p className="text-xs uppercase tracking-[.12em] text-[#806817]">{detail.data.production.status}</p>
          <h2 className="mt-2 font-serif text-3xl">{detail.data.production.title}</h2>
          <p className="mt-3 text-sm leading-6">{detail.data.production.briefing}</p>
          {detail.data.opportunity ? (
            <p className="mt-3 text-sm">Oportunidade #{detail.data.opportunity.id} congelada: profissional {detail.data.opportunity.professionalValue} · Ojú {detail.data.opportunity.ojuValue} · política v{detail.data.opportunity.commercialPolicyVersion}. A produção não altera esses números.</p>
          ) : null}
          <p className="mt-3 text-sm">Mídia ({detail.data.media.filter(item => item.mediaType === "foto").length}/{PRODUCTION_PHOTO_CAP} fotos · {detail.data.media.filter(item => item.mediaType === "vídeo").length}/{PRODUCTION_MINICLIP_CAP} miniclip). Pública no portal: não, só com autorização e curadoria.</p>
          <ul className="mt-2 grid gap-1 text-sm">
            {detail.data.media.map(item => (
              <li key={item.id}>{item.mediaType} #{item.mediaId} · {item.layer} · autorização {item.authorization} · publicationAllowed {String(item.publicationAllowed)}</li>
            ))}
          </ul>
          <ProductionAcervoAttach pending={attach.isPending} onAttach={mediaId => attach.mutate({ productionId: detail.data.production.id, mediaId })} />
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.data.production.status === "Planejada" ? <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: detail.data.production.id, status: "Confirmada" })}>Confirmar</Button> : null}
            {detail.data.production.status === "Confirmada" ? <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: detail.data.production.id, status: "Em produção" })}>Iniciar</Button> : null}
            {detail.data.production.status === "Aguardando mídia" || detail.data.production.status === "Em produção" ? <Button size="sm" variant="outline" disabled={submit.isPending} onClick={() => submit.mutate({ id: detail.data.production.id })}>Enviar para revisão</Button> : null}
            {canReview && detail.data.production.status === "Em revisão" ? <Button size="sm" className="bg-oju-verde text-oju-branco" disabled={approve.isPending} onClick={() => approve.mutate({ id: detail.data.production.id })}>Aprovar revisão</Button> : null}
            {canReview && detail.data.production.status === "Concluída" && !detail.data.production.deliveredAt ? <Button size="sm" variant="outline" onClick={() => toast.message("Entrega ao cliente fica em Comercial da Rede. Não publica no portal.")}>Entrega ≠ publicação</Button> : null}
            {detail.data.production.status !== "Cancelada" && detail.data.production.status !== "Concluída" ? <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: detail.data.production.id, status: "Cancelada" })}>Cancelar</Button> : null}
          </div>
        </section>
      ) : null}
    </AdminPage>
  );
}

function ProductionAcervoAttach({ pending, onAttach }: { pending: boolean; onAttach: (mediaId: number) => void }) {
  const { user } = useAuth();
  const canListAcervo = user?.role === "administrador" || user?.role === "administrador principal";
  const library = trpc.media.list.useQuery({ limit: 40, offset: 0 }, { enabled: canListAcervo });
  const [selectedId, setSelectedId] = useState("");
  const options = (library.data?.items || []).filter(item => mediaReadyToLinkProduction(item).ok);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const mediaId = Number(selectedId || new FormData(event.currentTarget).get("mediaId"));
    if (!mediaId) return toast.error("Selecione uma mídia do Acervo.");
    onAttach(mediaId);
  }

  return (
    <form className="mt-4 flex flex-wrap gap-2" onSubmit={submit}>
      {canListAcervo ? (
        <select name="mediaId" className="h-10 min-w-[16rem] rounded-md border bg-white px-3 text-sm" value={selectedId} onChange={event => setSelectedId(event.target.value)}>
          <option value="">Selecionar mídia do Acervo</option>
          {options.map(item => (
            <option key={item.id} value={item.id}>{item.filename || "Arquivo sem nome"} · {item.mediaType}{item.usages?.length ? " · já ligada" : ""}</option>
          ))}
        </select>
      ) : (
        <Input name="mediaId" type="number" min={1} placeholder="Mídia do Acervo" className="max-w-[10rem]" />
      )}
      <Button size="sm" disabled={pending} className="bg-oju-verde text-oju-branco">Ligar mídia existente</Button>
    </form>
  );
}
