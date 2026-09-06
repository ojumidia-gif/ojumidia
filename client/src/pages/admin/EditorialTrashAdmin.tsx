import { AlertTriangle, RotateCcw, TimerReset, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { confirmPhrasesMatch } from "@shared/confirmPhrase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin } from "./_shared";

type TrashPublication = { id: number; title: string; contentKind: string; deletedAt: Date | null; deletedByName: string | null; deletionNote: string | null; version: number; restoreUntil: Date | null; expired: boolean };

function formatDeadline(deadline: Date | null) {
  if (!deadline) return "Prazo indisponível";
  const milliseconds = new Date(deadline).getTime() - Date.now();
  if (milliseconds <= 0) return "Prazo encerrado — aguardando expurgo";
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  return `${hours}h ${minutes}min para restaurar`;
}

export default function EditorialTrashAdmin() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const utils = trpc.useUtils();
  const trash = trpc.editorial.trashList.useQuery(undefined, { enabled: principal, refetchInterval: 30_000 });
  const [target, setTarget] = useState<TrashPublication | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const refresh = () => { utils.editorial.trashList.invalidate(); utils.editorial.adminList.invalidate(); };
  const restore = trpc.editorial.restore.useMutation({ onSuccess: () => { toast.success("Publicação restaurada como arquivada e fora do portal público."); refresh(); }, onError: error => toast.error(error.message) });
  const purge = trpc.editorial.purgeTrash.useMutation({ onSuccess: () => { toast.success("Conteúdo excluído definitivamente; a trilha de auditoria foi preservada."); setTarget(null); setConfirmation(""); refresh(); }, onError: error => toast.error(error.message) });
  const items = useMemo(() => (trash.data || []) as TrashPublication[], [trash.data]);

  if (!principal) return <AdminPage eyebrow="Governança editorial" title="Lixeira Editorial"><section className="admin-card max-w-2xl p-6"><AlertTriangle className="h-6 w-6 text-[#8b4d24]" /><p className="mt-4 text-sm leading-6 text-[#655e52]">Somente a Equipe Ojú pode consultar, restaurar ou expurgar definitivamente conteúdos da Lixeira Editorial.</p></section></AdminPage>;

  return <AdminPage eyebrow="Governança editorial" title="Lixeira Editorial"><section className="mb-7 grid gap-4 border border-[#8b4d24]/25 bg-[#fff5ee] p-5 lg:grid-cols-[auto_1fr]"><div className="w-fit rounded-full bg-[#8b4d24] p-3 text-white"><TimerReset className="h-5 w-5" /></div><div><h2 className="font-serif text-2xl">Restauração por 24 horas.</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-[#655e52]">Uma publicação enviada para a lixeira sai imediatamente do site. Restauração por 24 horas. O expurgo definitivo remove o texto, vínculos, taxonomias e sugestões. As mídias voltam a existir só no Acervo ou na Lixeira de mídia até a Equipe Ojú escolher Excluir definitivamente lá. A Auditoria preserva o evento, não o arquivo.</p></div></section>{trash.isLoading ? <p>Carregando Lixeira Editorial...</p> : items.length ? <section className="grid gap-4">{items.map(item => <article key={item.id} className="admin-card grid gap-5 p-5 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eee9dc] px-2 py-1 text-[10px] font-bold uppercase tracking-[.1em]">{item.contentKind}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.expired ? "bg-[#f3e3d2] text-[#8b4d24]" : "bg-[#fff1ca] text-[#8b6200]"}`}>{formatDeadline(item.restoreUntil)}</span></div><h2 className="mt-3 font-serif text-2xl">{item.title}</h2><p className="mt-2 text-sm text-[#655e52]">Excluída por {item.deletedByName || "Super Admin"} em {item.deletedAt ? new Date(item.deletedAt).toLocaleString("pt-BR") : "data não disponível"}.</p>{item.deletionNote ? <p className="mt-3 border-l-2 border-[#8b4d24]/45 pl-3 text-sm leading-6 text-[#655e52]">Motivo: {item.deletionNote}</p> : null}</div><div className="flex flex-wrap content-start gap-2 lg:w-64 lg:justify-end">{!item.expired ? <Button size="sm" variant="outline" onClick={() => restore.mutate({ id: item.id, expectedVersion: item.version, note: "Restauração pela Lixeira Editorial dentro da janela de 24 horas." })} disabled={restore.isPending}><RotateCcw className="mr-2 h-4 w-4" />Restaurar</Button> : null}<Button size="sm" variant="outline" className="border-[#8b4d24] text-[#8b4d24]" onClick={() => { setTarget(item); setConfirmation(""); }}><Trash2 className="mr-2 h-4 w-4" />Excluir definitivamente</Button></div></article>)}</section> : <EmptyAdmin text="Nenhuma publicação está na Lixeira Editorial. Conteúdos excluídos logicamente aparecerão aqui durante a janela de restauração de 24 horas." />}{target && <AlertDialog open onOpenChange={open => { if (!open && !purge.isPending) { setTarget(null); setConfirmation(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle><AlertDialogDescription>Esta ação não restaura texto, taxonomias, relações ou sugestões da publicação. As mídias desvinculadas permanecem no Acervo/Lixeira de mídia. O registro de auditoria permanece.</AlertDialogDescription></AlertDialogHeader><label className="grid gap-2 text-sm font-medium">Digite o título para confirmar. Maiúsculas e acentos não impedem. <b>{target.title}</b><Input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} /></label><AlertDialogFooter><AlertDialogCancel disabled={purge.isPending}>Cancelar</AlertDialogCancel><Button type="button" disabled={!confirmPhrasesMatch(target.title, confirmation) || purge.isPending} className="bg-[#8b4d24] text-white hover:bg-[#723b1a]" onClick={() => purge.mutate({ id: target.id, confirmation })}>{purge.isPending ? "Excluindo..." : "Excluir definitivamente"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>}</AdminPage>;
}

