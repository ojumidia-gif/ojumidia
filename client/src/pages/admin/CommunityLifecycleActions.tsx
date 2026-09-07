import { communityNextStep } from "@/lib/editorialFlow";
import { Archive, FilePenLine, RotateCcw, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CommunityKind = "instituicao" | "evento" | "memoria";
type CommunityRecord = { id: number; title?: string; name?: string; status: string; consentStatus: string; deletedAt?: Date | string | null };

const labels: Record<CommunityKind, string> = { instituicao: "perfil", evento: "evento", memoria: "memória" };

export function CommunityLifecycleActions({ kind, record, isPrincipal, onEdit }: { kind: CommunityKind; record: CommunityRecord; isPrincipal: boolean; onEdit: () => void }) {
  const utils = trpc.useUtils();
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [note, setNote] = useState("");
  const [publishing, setPublishing] = useState(false);
  const refresh = () => { utils.community.listInstitutions.invalidate(); utils.community.listEvents.invalidate(); utils.community.listMemories.invalidate(); utils.community.publicInstitutions.invalidate(); utils.community.publicEvents.invalidate(); utils.community.publicMemories.invalidate(); };
  const onSuccess = (message: string) => { toast.success(message); setConfirmTrash(false); setNote(""); refresh(); };
  const onError = (error: { message: string }) => { toast.error(error.message); };
  const institutionStatus = trpc.community.setInstitutionStatus.useMutation({ onSuccess: () => onSuccess("Atualizado."), onError });
  const eventStatus = trpc.community.setEventStatus.useMutation({ onSuccess: () => onSuccess("Atualizado."), onError });
  const memoryStatus = trpc.community.setMemoryStatus.useMutation({ onSuccess: () => onSuccess("Atualizado."), onError });
  const updateInstitution = trpc.community.updateInstitution.useMutation({ onError });
  const updateEvent = trpc.community.updateEvent.useMutation({ onError });
  const updateMemory = trpc.community.updateMemory.useMutation({ onError });
  const trashInstitution = trpc.community.trashInstitution.useMutation({ onSuccess: () => onSuccess("Na lixeira."), onError });
  const trashEvent = trpc.community.trashEvent.useMutation({ onSuccess: () => onSuccess("Na lixeira."), onError });
  const trashMemory = trpc.community.trashMemory.useMutation({ onSuccess: () => onSuccess("Na lixeira."), onError });
  const restoreInstitution = trpc.community.restoreInstitution.useMutation({ onSuccess: () => onSuccess("Restaurado."), onError });
  const restoreEvent = trpc.community.restoreEvent.useMutation({ onSuccess: () => onSuccess("Restaurado."), onError });
  const restoreMemory = trpc.community.restoreMemory.useMutation({ onSuccess: () => onSuccess("Restaurado."), onError });
  const deleted = Boolean(record.deletedAt);
  const title = record.title || record.name || labels[kind];
  const setStatus = (status: "Rascunho" | "Publicada" | "Arquivada") => {
    const payload = { id: record.id, status };
    if (kind === "instituicao") institutionStatus.mutate(payload);
    if (kind === "evento") eventStatus.mutate(payload);
    if (kind === "memoria") memoryStatus.mutate(payload);
  };
  const goLive = async () => {
    setPublishing(true);
    try {
      if (record.consentStatus !== "Autorizado") {
        if (kind === "instituicao") await updateInstitution.mutateAsync({ id: record.id, consentStatus: "Autorizado" });
        if (kind === "evento") await updateEvent.mutateAsync({ id: record.id, consentStatus: "Autorizado" });
        if (kind === "memoria") await updateMemory.mutateAsync({ id: record.id, consentStatus: "Autorizado" });
      }
      setStatus("Publicada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar.");
    } finally {
      setPublishing(false);
    }
  };
  const trash = () => {
    const payload = { id: record.id, note: note.trim() };
    if (kind === "instituicao") trashInstitution.mutate(payload);
    if (kind === "evento") trashEvent.mutate(payload);
    if (kind === "memoria") trashMemory.mutate(payload);
  };
  const restore = () => {
    const payload = { id: record.id };
    if (kind === "instituicao") restoreInstitution.mutate(payload);
    if (kind === "evento") restoreEvent.mutate(payload);
    if (kind === "memoria") restoreMemory.mutate(payload);
  };
  const busy = publishing || institutionStatus.isPending || eventStatus.isPending || memoryStatus.isPending || updateInstitution.isPending || updateEvent.isPending || updateMemory.isPending;

  if (deleted) return <div className="mt-4 border-t border-oju-terra/10 pt-4"><p className="mb-3 text-xs text-[#8b4d24]">Na lixeira. Fora do site.</p>{isPrincipal && <Button variant="outline" size="sm" onClick={restore}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restaurar</Button>}</div>;

  return <div className="mt-4 border-t border-oju-terra/10 pt-4"><p className="mb-3 text-xs text-oju-terra-suave">{communityNextStep(record.consentStatus, record.status).hint}</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={onEdit}><FilePenLine className="mr-1 h-3.5 w-3.5" />Editar</Button>{record.status === "Publicada" ? <Button variant="outline" size="sm" onClick={() => setStatus("Rascunho")}>Tirar do ar</Button> : <Button size="sm" className="bg-oju-verde text-oju-branco" disabled={busy} onClick={() => void goLive()}><Send className="mr-1 h-3.5 w-3.5" />{record.consentStatus !== "Autorizado" ? "Autorizar e publicar" : "Publicar no site"}</Button>}{record.status !== "Arquivada" && <Button variant="ghost" size="sm" onClick={() => setStatus("Arquivada")}><Archive className="mr-1 h-3.5 w-3.5" />Arquivar</Button>}{isPrincipal && <Button variant="outline" size="sm" className="border-[#8b4d24] text-[#8b4d24]" onClick={() => setConfirmTrash(true)}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button>}</div><AlertDialog open={confirmTrash} onOpenChange={open => { setConfirmTrash(open); if (!open) setNote(""); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Enviar para a lixeira?</AlertDialogTitle><AlertDialogDescription>“{title}” sai do diretório público.</AlertDialogDescription></AlertDialogHeader><label className="grid gap-2 text-sm font-medium">Motivo<Textarea value={note} onChange={event => setNote(event.target.value)} /></label><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={note.trim().length < 3} className="bg-[#8b4d24] text-white hover:bg-[#723b1a]" onClick={event => { event.preventDefault(); trash(); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}
