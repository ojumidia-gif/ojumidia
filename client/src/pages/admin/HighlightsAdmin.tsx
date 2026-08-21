import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin, statusStyle } from "./_shared";

const options = ["Nenhum", "Destaque principal", "Destaque secundário", "Recomendado"] as const;

export default function HighlightsAdmin() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.editorial.adminList.useQuery(undefined, { refetchInterval: 5000 });
  const [changes, setChanges] = useState<Record<number, { placement: typeof options[number]; relevance: number; featured: boolean }>>({});
  const save = trpc.editorial.setFeatured.useMutation({ onSuccess: () => { toast.success("Curadoria atualizada. A Home será sincronizada em instantes."); utils.editorial.adminList.invalidate(); }, onError: error => toast.error(error.message) });
  const published = data?.filter(item => item.status === "Publicada" && item.isPublic) || [];
  return <AdminPage eyebrow="Curadoria" title="A Home é uma escolha editorial."><p className="mb-7 max-w-2xl text-sm leading-6 text-[#655e52]">Defina destaque manual, intensidade de relevância e posição na Home. O portal mantém toda a produção acessível, inclusive conteúdos de outros territórios.</p>{isLoading ? <p>Carregando conteúdos publicados...</p> : published.length ? <div className="grid gap-4">{published.map(item => { const state = changes[item.id] || { placement: item.homePlacement, relevance: item.relevance, featured: item.manualFeatured }; return <article key={item.id} className="admin-card grid gap-4 p-5 lg:grid-cols-[1fr_190px_110px_auto]"><div><p className="font-serif text-2xl">{item.title}</p><div className="mt-2 flex gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span><span className="rounded-full bg-[#eee9dc] px-2 py-1 text-[11px]">{item.contentKind}</span></div></div><label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[#655e52]">Posição<select value={state.placement} onChange={event => setChanges({ ...changes, [item.id]: { ...state, placement: event.target.value as typeof options[number] } })} className="h-9 rounded-md border bg-white px-2 text-sm normal-case tracking-normal text-[#242017]">{options.map(option => <option key={option}>{option}</option>)}</select></label><label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[#655e52]">Relevância<input type="number" min="0" max="100" value={state.relevance} onChange={event => setChanges({ ...changes, [item.id]: { ...state, relevance: Number(event.target.value) } })} className="h-9 rounded-md border bg-white px-2 text-sm" /></label><div className="flex items-end gap-2"><Button asChild variant="outline"><Link href={`/admin/home-preview/${item.id}`}>Prévia</Link></Button><Button disabled={save.isPending} onClick={() => save.mutate({ id: item.id, manualFeatured: state.featured, relevance: state.relevance, homePlacement: state.placement, homeOrder: 0 })} className="bg-[#242017] text-white">Salvar</Button></div></article>; })}</div> : <EmptyAdmin text="A curadoria estará disponível assim que houver conteúdo publicado. Apenas conteúdos publicados e ativos podem aparecer na Home." />}</AdminPage>;
}
