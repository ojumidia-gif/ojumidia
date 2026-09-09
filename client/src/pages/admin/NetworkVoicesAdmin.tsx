import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { canSetNationalVoiceCuration } from "@shared/networkVoices";
import { AdminPage, EmptyAdmin } from "./_shared";

export default function NetworkVoicesAdmin() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.networkVoices.list.useQuery();
  const decide = trpc.networkVoices.decide.useMutation({ onSuccess: () => utils.networkVoices.list.invalidate() });
  const curate = trpc.networkVoices.setCuration.useMutation({ onSuccess: () => utils.networkVoices.list.invalidate() });
  const [note, setNote] = useState("");
  const principal = canSetNationalVoiceCuration(user?.role || "");

  return (
    <AdminPage eyebrow="Vozes da Rede Ojú" title="Análise, publicação e curadoria documental.">
      <p className="-mt-4 mb-8 max-w-3xl text-sm leading-6 text-oju-terra-suave">Aprovação não é destaque. Curadoria Ojú é decisão humana: não usa volume, estrela, voto nem pagamento. Admin territorial opera só o próprio escopo. Curadoria nacional é do Super Admin.</p>
      {isLoading ? <p>Carregando depoimentos…</p> : data?.length ? (
        <div className="grid gap-4">
          {data.map(item => (
            <article key={item.id} className="admin-card p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#806817]">{item.status} · {item.relationKind} · curadoria {item.curationScope}</p>
              <p className="mt-3 font-serif text-2xl leading-snug">{item.body}</p>
              <p className="mt-3 text-sm text-oju-terra-suave">{item.speakerName || "Sem identificação pública"} · {item.speakerNameVisibility}</p>
              {item.adjustmentNote ? <p className="mt-2 text-sm text-oju-terra-suave">Ajuste: {item.adjustmentNote}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {item.status === "Aguardando análise" ? (
                  <>
                    <Button size="sm" className="bg-oju-verde text-oju-branco" disabled={decide.isPending} onClick={() => decide.mutate({ id: item.id, action: "approve" })}>Aprovar</Button>
                    <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: item.id, action: "requestAdjustment", note })}>Pedir ajuste</Button>
                    <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: item.id, action: "reject", note })}>Rejeitar</Button>
                  </>
                ) : null}
                {item.status === "Ajuste solicitado" ? (
                  <>
                    <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: item.id, action: "resubmit" })}>Voltar à análise</Button>
                    <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: item.id, action: "reject", note })}>Rejeitar</Button>
                  </>
                ) : null}
                {item.status === "Aprovado" ? (
                  <>
                    <Button size="sm" className="bg-oju-verde text-oju-branco" disabled={decide.isPending} onClick={() => decide.mutate({ id: item.id, action: "publish" })}>Publicar</Button>
                    <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: item.id, action: "reject", note })}>Rejeitar</Button>
                  </>
                ) : null}
                {item.status === "Publicado" ? (
                  <>
                    <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: item.id, action: "unpublish" })}>Retirar publicação</Button>
                    {principal ? <Button size="sm" disabled={curate.isPending} onClick={() => curate.mutate({ id: item.id, curationScope: "Nacional" })}>Curadoria nacional</Button> : null}
                    <Button size="sm" variant="outline" disabled={curate.isPending} onClick={() => curate.mutate({ id: item.id, curationScope: "Territorial" })}>Destaque territorial</Button>
                    <Button size="sm" variant="outline" disabled={curate.isPending} onClick={() => curate.mutate({ id: item.id, curationScope: "Nenhum" })}>Não destacar</Button>
                  </>
                ) : null}
                {item.status === "Rejeitado" || item.status === "Retirado" ? (
                  <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: item.id, action: "reopen" })}>Reabrir análise</Button>
                ) : null}
              </div>
              {(item.status === "Aguardando análise" || item.status === "Ajuste solicitado" || item.status === "Aprovado") ? (
                <Textarea className="mt-4" value={note} onChange={event => setNote(event.target.value)} placeholder="Nota interna de ajuste ou rejeição, se necessário." />
              ) : null}
            </article>
          ))}
        </div>
      ) : <EmptyAdmin text="Nenhum depoimento no escopo. O portal permanece vazio até haver envio real e publicação." />}
    </AdminPage>
  );
}
