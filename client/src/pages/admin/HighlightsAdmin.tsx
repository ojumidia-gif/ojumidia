import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin, SiteReadiness, statusStyle } from "./_shared";

const options = ["Nenhum", "Destaque principal", "Destaque secundário", "Recomendado"] as const;

export default function HighlightsAdmin() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(0);
  const limit = 30;
  const { data, isLoading } = trpc.editorial.adminList.useQuery({ publishedOnly: true, limit, offset: page * limit }, { refetchInterval: 5000 });
  const [changes, setChanges] = useState<Record<number, { placement: typeof options[number]; relevance: number; featured: boolean; homeOrder: number; highlightExpiresAt: string }>>({});
  const save = trpc.editorial.setFeatured.useMutation({ onSuccess: () => { toast.success("Curadoria atualizada. A capa entra em Histórias recentes em instantes."); utils.editorial.adminList.invalidate(); utils.editorial.featured.invalidate(); }, onError: error => toast.error(error.message) });
  const published = data?.items || [];
  return <AdminPage eyebrow="Equipe Ojú · Home nacional" title="A Home é uma escolha editorial.">
    <p className="mb-4 max-w-3xl text-sm leading-6 text-oju-terra-suave">Marque <strong>Mostrar em Histórias recentes</strong> para a foto de capa aparecer na Home. Publicar no portal não faz isso sozinho.</p>
    <div className="mb-7"><SiteReadiness items={!isLoading && !published.length ? ["Ainda não há conteúdo publicado para curar na Home nacional."] : []} readyText={!isLoading && published.length ? "A capa autorizada do conteúdo é a que a Home usa." : undefined} /></div>
    {isLoading ? <p>Carregando conteúdos publicados...</p> : published.length ? <div className="grid gap-4">
      {published.map(item => {
        const state = changes[item.id] || { placement: item.homePlacement, relevance: item.relevance, featured: item.manualFeatured || item.homePlacement !== "Nenhum", homeOrder: item.homeOrder, highlightExpiresAt: item.highlightExpiresAt ? new Date(item.highlightExpiresAt).toISOString().slice(0, 16) : "" };
        const onHome = state.featured && state.placement !== "Nenhum";
        return (
          <article key={item.id} className="admin-card grid gap-4 p-5 lg:grid-cols-[96px_1fr_170px_90px_90px_auto]">
            <div className="h-24 overflow-hidden rounded-xl bg-oju-papel">
              {item.coverUrl ? <img src={item.coverUrl} alt="" className="h-full w-full object-cover" /> : <p className="flex h-full items-center justify-center px-2 text-center text-[11px] text-oju-terra-suave">Sem capa</p>}
            </div>
            <div>
              <p className="font-serif text-2xl">{item.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyle[item.status]}`}>{item.status}</span>
                <span className="rounded-full bg-oju-papel px-2 py-1 text-[11px]">{item.contentKind}</span>
                {onHome ? <span className="rounded-full bg-[#d8eadc] px-2 py-1 text-[11px] font-semibold text-[#2c683b]">Na Home</span> : <span className="rounded-full bg-oju-papel px-2 py-1 text-[11px]">Fora da Home</span>}
              </div>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={state.featured} onChange={event => setChanges({ ...changes, [item.id]: { ...state, featured: event.target.checked, placement: event.target.checked ? (state.placement === "Nenhum" ? "Recomendado" : state.placement) : "Nenhum" } })} />
                <span><strong>Mostrar em Histórias recentes</strong><span className="mt-1 block text-xs text-oju-terra-suave">Usa a foto de capa deste conteúdo.</span></span>
              </label>
            </div>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-oju-terra-suave">Posição<select value={state.placement} onChange={event => setChanges({ ...changes, [item.id]: { ...state, placement: event.target.value as typeof options[number], featured: event.target.value !== "Nenhum" } })} className="h-9 rounded-md border bg-white px-2 text-sm normal-case tracking-normal text-oju-terra">{options.map(option => <option key={option}>{option}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-oju-terra-suave">Ordem<input type="number" min="0" max="99" value={state.homeOrder} onChange={event => setChanges({ ...changes, [item.id]: { ...state, homeOrder: Number(event.target.value) } })} className="h-9 rounded-md border bg-white px-2 text-sm" /></label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-oju-terra-suave">Relevância<input type="number" min="0" max="100" value={state.relevance} onChange={event => setChanges({ ...changes, [item.id]: { ...state, relevance: Number(event.target.value) } })} className="h-9 rounded-md border bg-white px-2 text-sm" /></label>
            <div className="flex flex-col justify-end gap-2">
              <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-oju-terra-suave">Expira<input type="datetime-local" value={state.highlightExpiresAt} onChange={event => setChanges({ ...changes, [item.id]: { ...state, highlightExpiresAt: event.target.value } })} className="h-9 rounded-md border bg-white px-2 text-sm" /></label>
              <div className="flex gap-2">
                <Button asChild variant="outline"><Link href={`/admin/home-preview/${item.id}`}>Prévia</Link></Button>
                <Button disabled={save.isPending} onClick={() => save.mutate({ id: item.id, manualFeatured: state.featured && state.placement !== "Nenhum", relevance: state.relevance, homePlacement: state.featured ? (state.placement === "Nenhum" ? "Recomendado" : state.placement) : "Nenhum", homeOrder: state.homeOrder, highlightExpiresAt: state.highlightExpiresAt ? new Date(state.highlightExpiresAt) : null })} className="bg-oju-verde text-oju-branco">Salvar</Button>
              </div>
            </div>
          </article>
        );
      })}
      <div className="flex justify-end gap-2">{page > 0 ? <Button variant="outline" onClick={() => setPage(current => current - 1)}>Anterior</Button> : null}{data?.hasMore ? <Button variant="outline" onClick={() => setPage(current => current + 1)}>Próxima</Button> : null}</div>
    </div> : <EmptyAdmin text="Publique conteúdos e então escolha o que entra na Home. Nada publicado aparece automaticamente na vitrine." />}
  </AdminPage>;
}
