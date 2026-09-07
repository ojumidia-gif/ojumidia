import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { confirmPhrasesMatch } from "@shared/confirmPhrase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";

type TrashMedia = { id: number; filename: string | null; credit: string; mediaType: string; assetUrl: string; deletedAt: Date | null; deletionNote: string | null; storageKey: string | null };

export default function MediaTrashAdmin() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const utils = trpc.useUtils();
  const trash = trpc.media.trashList.useQuery(undefined, { refetchInterval: 10_000 });
  const [target, setTarget] = useState<TrashMedia | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const items = useMemo(() => (trash.data?.items || []) as TrashMedia[], [trash.data]);
  const refresh = () => { utils.media.list.invalidate(); utils.media.trashList.invalidate(); utils.media.retentionOverview.invalidate(); };
  const restore = trpc.media.restore.useMutation({ onSuccess: () => { toast.success("Mídia restaurada no Acervo como arquivada."); refresh(); }, onError: error => toast.error(error.message) });
  const purge = trpc.media.purge.useMutation({ onSuccess: () => { toast.success("Exclusão definitiva concluída. O evento permanece na Auditoria."); setTarget(null); setConfirmation(""); refresh(); }, onError: error => toast.error(error.message) });
  const expected = target ? (target.filename?.trim() || `mídia #${target.id}`) : "";

  return (
    <AdminPage eyebrow="Governança de mídia" title="Lixeira de mídia">
      <section className="mb-7 grid gap-4 border border-[#8b4d24]/25 bg-[#fff5ee] p-5">
        <h2 className="font-serif text-2xl">Segunda chance, não arquivo permanente.</h2>
        <p className="max-w-4xl text-sm leading-6 text-oju-terra-suave">Acervo → Excluir → Lixeira. Restaurar devolve ao Acervo. Excluir definitivamente destrói objeto no Tigris, metadado no Aiven e sessão de upload inútil. A Auditoria guarda só o evento.</p>
      </section>
      {trash.isLoading ? <p>Carregando Lixeira de mídia...</p> : items.length ? (
        <section className="grid gap-4">
          {items.map(item => (
            <article key={item.id} className="admin-card grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8b4d24]">Na lixeira</p>
                <h2 className="mt-2 font-serif text-2xl">{item.filename || `Mídia #${item.id}`}</h2>
                <p className="mt-1 text-sm text-oju-terra-suave">Crédito: {item.credit} · {item.mediaType}</p>
                {item.deletedAt ? <p className="mt-2 text-xs text-oju-terra-suave">Enviada em {new Date(item.deletedAt).toLocaleString("pt-BR")}</p> : null}
                {item.deletionNote ? <p className="mt-3 border-l-2 border-[#8b4d24]/45 pl-3 text-sm">{item.deletionNote}</p> : null}
              </div>
              {principal ? (
                <div className="flex flex-wrap content-start gap-2 lg:w-64 lg:justify-end">
                  <Button size="sm" variant="outline" onClick={() => restore.mutate({ id: item.id })} disabled={restore.isPending}><RotateCcw className="mr-2 h-4 w-4" />Restaurar</Button>
                  <Button size="sm" variant="outline" className="border-[#8b4d24] text-[#8b4d24]" onClick={() => { setTarget(item); setConfirmation(""); }}><Trash2 className="mr-2 h-4 w-4" />Excluir definitivamente</Button>
                </div>
              ) : <p className="text-xs text-oju-terra-suave">Somente a Equipe Ojú restaura ou expurga.</p>}
            </article>
          ))}
        </section>
      ) : <EmptyAdmin text="Nenhuma mídia está na Lixeira. O Acervo ativo não lista exclusões lógicas." />}
      {target && principal ? (
        <AlertDialog open onOpenChange={open => { if (!open && !purge.isPending) { setTarget(null); setConfirmation(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
              <AlertDialogDescription>Irreversível: some do Acervo, da Lixeira e do Tigris. Não haverá Restaurar. A Auditoria registra o evento, não o arquivo.</AlertDialogDescription>
            </AlertDialogHeader>
            <label className="grid gap-2 text-sm font-medium">Digite o nome para confirmar. Maiúsculas e acentos não impedem. <b>{expected}</b><Input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} /></label>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={purge.isPending}>Cancelar</AlertDialogCancel>
              <Button type="button" disabled={!confirmPhrasesMatch(expected, confirmation) || purge.isPending} className="bg-[#8b4d24] text-white hover:bg-[#723b1a]" onClick={() => purge.mutate({ id: target.id, confirmation })}>{purge.isPending ? "Excluindo..." : "Excluir definitivamente"}</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      {!principal ? <section className="mt-6 admin-card max-w-2xl p-6"><AlertTriangle className="h-6 w-6 text-[#8b4d24]" /><p className="mt-4 text-sm leading-6 text-oju-terra-suave">A consulta respeita o seu território. Expurgar é exclusivo da Equipe Ojú.</p></section> : null}
    </AdminPage>
  );
}
