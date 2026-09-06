import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { Edit3, FolderOpen, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin, SiteReadiness, AdminFlowGuide } from "./_shared";
import { TaxonomyMediaPanel } from "./TaxonomyMediaPanel";

const dimensions = ["Tipo de conteúdo", "Tema", "Localização", "Território", "Pessoa/organização", "Evento", "Data"] as const;
type Dimension = typeof dimensions[number];

export default function TaxonomiesAdmin() {
  const [location] = useLocation();
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const territoriesFocus = location.startsWith("/admin/territorios");
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.editorial.adminTaxonomies.useQuery(undefined, { refetchInterval: 5000 });
  const canWrite = (item: { createdBy?: number | null }) => principal || item.createdBy === user?.id;
  const [dimension, setDimension] = useState<Dimension>("Território");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mapVisibility, setMapVisibility] = useState<"Não divulgar" | "Aproximada" | "Pública">("Não divulgar");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mediaTargetId, setMediaTargetId] = useState<number | null>(null);
  const { data: linked } = trpc.editorial.taxonomyRelations.useQuery({ id: selectedId || 0 }, { enabled: Boolean(selectedId) });
  const refreshCatalog = () => { utils.editorial.adminTaxonomies.invalidate(); utils.editorial.taxonomies.invalidate(); };
  const create = trpc.editorial.createTaxonomy.useMutation({ onSuccess: () => { toast.success(territoriesFocus ? "Território cadastrado. Ligue-o nas publicações." : "Item cadastrado."); reset(); refreshCatalog(); }, onError: error => toast.error(error.message) });
  const update = trpc.editorial.updateTaxonomy.useMutation({ onSuccess: () => { toast.success("Item atualizado."); reset(); refreshCatalog(); }, onError: error => toast.error(error.message) });
  const remove = trpc.editorial.removeTaxonomy.useMutation({ onSuccess: () => { toast.success("Item removido. Os conteúdos permanecem preservados, apenas sem este vínculo."); refreshCatalog(); setSelectedId(null); setMediaTargetId(null); }, onError: error => toast.error(error.message) });
  const reset = () => { setEditingId(null); setName(""); setDescription(""); setParentId(""); setLatitude(""); setLongitude(""); setMapVisibility("Não divulgar"); };
  const startNew = (nextDimension: Dimension) => { setDimension(territoriesFocus ? "Território" : nextDimension); reset(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const grouped = (territoriesFocus ? (["Território"] as const) : dimensions).map(item => [item, data?.filter(entry => entry.dimension === item) || []] as const);
  useEffect(() => { if (territoriesFocus) setDimension("Território"); }, [territoriesFocus]);
  const parents = data?.filter(item => item.id !== editingId && item.dimension === dimension) || [];
  const mediaTarget = data?.find(item => item.id === mediaTargetId);
  const edit = (item: NonNullable<typeof data>[number]) => { setEditingId(item.id); setDimension(item.dimension as Dimension); setName(item.name); setDescription(item.description || ""); setParentId(item.parentId ? String(item.parentId) : ""); setLatitude(item.latitude ? String(item.latitude) : ""); setLongitude(item.longitude ? String(item.longitude) : ""); setMapVisibility(item.mapVisibility as typeof mapVisibility); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return <AdminPage eyebrow={territoriesFocus ? "Portal → Territórios" : "Territórios e taxonomias"} title={territoriesFocus ? "Cadastrar, editar e publicar no mapa." : "Criar, relacionar e documentar."} action={null}>
    {territoriesFocus ? <p className="-mt-4 mb-4 max-w-3xl text-sm leading-6 text-[#655e52]">Cadastre o território. Depois ligue histórias e coberturas no conteúdo. Visibilidade no mapa é opcional e só com autorização da casa. Você edita só o que cadastrou; o catálogo nacional fica com a Equipe Ojú.</p> : null}
    {territoriesFocus ? <AdminFlowGuide destinationId="territorios" /> : null}
    {territoriesFocus ? <div className="mb-6"><SiteReadiness items={(data || []).filter(item => item.dimension === "Território" && item.mapVisibility === "Não divulgar").map(item => `${item.name} ainda fora de /territorios.`)} readyText="Os territórios com visibilidade autorizada já podem aparecer no mapa do portal." /></div> : null}
    <section className="admin-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-serif text-2xl">{editingId ? `Editar ${dimension}` : `Cadastrar ${dimension}`}</p><p className="mt-2 max-w-3xl text-sm leading-6 text-[#655e52]">{territoriesFocus ? "Nome basta para ligar publicações. Mapa só com autorização." : "Escolha a dimensão, salve, depois relacione conteúdos ou adicione mídia."}</p></div>{editingId && <Button variant="outline" size="sm" onClick={reset}><X className="mr-1 h-3.5 w-3.5" />Cancelar edição</Button>}</div>
      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={event => { event.preventDefault(); const mapData = dimension === "Território" ? { latitude: latitude || undefined, longitude: longitude || undefined, mapVisibility } : {}; if (editingId) update.mutate({ id: editingId, name, description: description || null, parentId: parentId ? Number(parentId) : null, ...mapData }); else create.mutate({ dimension, name, description: description || undefined, parentId: parentId ? Number(parentId) : undefined, ...mapData }); }}>
        <label className="grid gap-2 text-sm font-medium">O que você está cadastrando?<select disabled={Boolean(editingId) || territoriesFocus} value={dimension} onChange={event => { setDimension(event.target.value as Dimension); setParentId(""); }} className="h-10 rounded-md border bg-white px-3 disabled:opacity-60">{dimensions.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium">Nome<Input required minLength={2} value={name} onChange={event => setName(event.target.value)} placeholder={`Nome de ${dimension.toLowerCase()}`} /></label>
        <label className="grid gap-2 text-sm font-medium">Relacionado a <span className="font-normal text-[#655e52]">(opcional)</span><select value={parentId} onChange={event => setParentId(event.target.value)} className="h-10 rounded-md border bg-white px-3"><option value="">Sem relação superior</option>{parents.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium">Descrição ou contexto <span className="font-normal text-[#655e52]">(opcional)</span><Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Explique como este item deve aparecer e ser encontrado no acervo." /></label>
        {dimension === "Território" && <details className="rounded-xl border border-[#9f7c31]/35 bg-[#fff7e8] p-4 md:col-span-2"><summary className="cursor-pointer text-sm font-semibold text-[#49321e]">Referência territorial para o mapa</summary><p className="mt-2 text-xs leading-5 text-[#6b4a2b]">Nome já basta para ligar histórias. Coordenadas só quando a comunidade autorizou. Opcional — só com autorização da casa.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><label className="grid gap-1 text-xs font-medium">Visibilidade<select value={mapVisibility} onChange={event => setMapVisibility(event.target.value as typeof mapVisibility)} className="h-10 rounded border bg-white px-3"><option>Não divulgar</option><option>Aproximada</option><option>Pública</option></select></label><label className="grid gap-1 text-xs font-medium">Latitude<Input value={latitude} onChange={event => setLatitude(event.target.value)} inputMode="decimal" placeholder="-3.1190" required={mapVisibility === "Pública"}/></label><label className="grid gap-1 text-xs font-medium">Longitude<Input value={longitude} onChange={event => setLongitude(event.target.value)} inputMode="decimal" placeholder="-60.0217" required={mapVisibility === "Pública"}/></label></div></details>}
        <div className="flex justify-end md:col-span-2"><Button disabled={create.isPending || update.isPending} className="bg-[#242017] text-white">{editingId ? "Salvar alterações" : `Cadastrar ${dimension}`}</Button></div>
      </form>
    </section>
    {selectedId && <section className="admin-card mt-7 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#806817]">Conteúdos relacionados</p><p className="mt-1 text-sm text-[#655e52]">Só aparecem os conteúdos da sua carteira. Os de outros admins não entram aqui.</p></div><Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></Button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{linked?.length ? linked.map(item => <div key={item.id} className="rounded-xl border border-[#242017]/10 bg-white p-4"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-[#655e52]">{item.contentKind} · {item.status}</p><div className="mt-3 flex gap-2"><Button asChild size="sm" variant="outline"><Link href={`/admin/editar/${item.id}`}>Editar conteúdo</Link></Button>{item.status === "Publicada" && <Button asChild size="sm"><Link href={`/admin/preview/${item.id}`}>Revisar</Link></Button>}</div></div>) : <p className="text-sm text-[#655e52]">Nenhum conteúdo seu está ligado a este item ainda.</p>}</div></section>}
    {mediaTarget && canWrite(mediaTarget) && <div><div className="mt-7 flex justify-end"><Button size="sm" variant="outline" onClick={() => setMediaTargetId(null)}><X className="mr-1 h-3.5 w-3.5" />Fechar mídias</Button></div><TaxonomyMediaPanel taxonomy={mediaTarget} /></div>}
    <div className="mt-7 grid gap-5 lg:grid-cols-2">{isLoading ? <p>Carregando itens...</p> : grouped.map(([label, entries]) => <section key={label} className="admin-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#806817]">{label}</p><Button size="sm" variant="outline" onClick={() => startNew(label)}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button></div><div className="mt-4 space-y-2">{entries.length ? entries.map(item => <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#242017]/10 bg-white px-3 py-3"><div><p className="text-sm font-medium">{item.name}</p>{item.description && <p className="mt-1 text-xs text-[#655e52]">{item.description}</p>}{!canWrite(item) && <p className="mt-1 text-[11px] text-[#806817]">Catálogo compartilhado — ligue nas suas publicações; não edita.</p>}</div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" title="Ver conteúdos relacionados" onClick={() => setSelectedId(item.id)}><FolderOpen className="h-4 w-4" /></Button>{canWrite(item) ? <><Button size="icon" variant="ghost" title="Adicionar imagem ou vídeo" onClick={() => { setMediaTargetId(item.id); setSelectedId(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ImagePlus className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Editar item" onClick={() => edit(item)}><Edit3 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Excluir item" onClick={() => { if (window.confirm(`Remover “${item.name}”? Os conteúdos não serão excluídos.`)) remove.mutate({ id: item.id }); }}><Trash2 className="h-4 w-4 text-[#8b4d24]" /></Button></> : null}</div></div>) : <div className="rounded-xl border border-dashed border-[#242017]/15 bg-white/60 p-4"><p className="text-sm text-[#756e60]">Nenhum item cadastrado.</p><Button className="mt-3" size="sm" onClick={() => startNew(label)}><Plus className="mr-1 h-3.5 w-3.5" />Cadastrar {label}</Button></div>}</div></section>)}</div>
    {!isLoading && !data?.length && <div className="mt-7"><EmptyAdmin text="Cadastre primeiro um Território, Localização, Organização, Evento ou Tema. Depois, adicione uma imagem ou vídeo pelo ícone de mídia do item cadastrado." /></div>}
  </AdminPage>;
}
