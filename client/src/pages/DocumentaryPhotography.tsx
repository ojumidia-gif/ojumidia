import { ArrowRight, Camera, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { trpc } from "@/lib/trpc";

const PAGE_SIZE = 8;
function CollectionCard({ collection, featured = false }: { collection: any; featured?: boolean }) {
  const cover = collection.photos.find((photo: any) => photo?.assetUrl);
  const date = collection.publishedAt ? new Date(collection.publishedAt).toLocaleDateString("pt-BR") : "";
  return (
    <article className={`group relative overflow-hidden border border-oju-terra/12 bg-oju-preto-filme text-oju-branco ${featured ? "md:col-span-2" : ""}`}>
      <Link href={`/historias/${collection.slug}`} className="block h-full">
        {cover?.assetUrl ? (
          <img src={cover.assetUrl} alt={cover.caption || collection.title} className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${featured ? "aspect-[16/8]" : "aspect-[4/3]"}`} />
        ) : (
          <div className={`absolute inset-0 grid place-items-center bg-oju-preto-suave ${featured ? "aspect-[16/8]" : "aspect-[4/3]"}`}><Camera className="h-8 w-8 text-oju-dourado" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className={`relative flex h-full flex-col justify-end p-5 ${featured ? "min-h-96" : "min-h-72"}`}>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-oju-dourado-claro">Coleção documental · {collection.photos.length} {collection.photos.length === 1 ? "fotografia" : "fotografias"}</p>
          <h2 className={`mt-3 font-serif leading-[1.05] ${featured ? "text-4xl" : "text-3xl"}`}>{collection.title}</h2>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/80">{collection.summary || collection.subtitle || "Coleção visual documental da Ojú Mídia."}</p>
          {cover?.location && <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-white/75"><MapPin className="h-3.5 w-3.5" />{cover.location}</p>}
          <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-oju-dourado-claro">Ver coleção <ArrowRight className="h-4 w-4" /></span>
          <p className="mt-3 text-[10px] uppercase tracking-[.12em] text-white/55">{date}</p>
        </div>
      </Link>
    </article>
  );
}
export default function DocumentaryPhotography() { const [offset, setOffset] = useState(0); const [collections, setCollections] = useState<any[]>([]); const { data, isLoading, isFetching } = trpc.editorial.photoDocumentary.useQuery({ limit: PAGE_SIZE, offset }); useEffect(() => { if (data) setCollections(current => offset === 0 ? data.collections : [...current, ...data.collections.filter(next => !current.some(item => item.id === next.id))]); }, [data, offset]); const lead = collections[0]; const remaining = collections.slice(1); return <div className="public-page"><PublicHeader /><main className="container pb-16 pt-16"><section className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-oju-dende">Acervo visual</p><h1 className="mt-4 max-w-3xl font-serif text-6xl leading-[.95] sm:text-7xl">Fotografia documental</h1><p className="mt-7 max-w-2xl text-base leading-7 text-oju-terra-suave">Coleções de imagens que guardam presenças, territórios e acontecimentos. Cada foto mantém crédito, contexto, data e biografia viva.</p></div><div className="self-end rounded border border-oju-terra/12 bg-oju-paz-claro p-6"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">Coleções, não portfólio</p><p className="mt-5 font-serif text-2xl leading-snug">Cada evento e encontro ganha contexto próprio, sem perder sua relação com o território.</p><p className="mt-4 text-sm leading-6 text-oju-terra-suave">O catálogo organiza as coleções publicadas para que o acervo possa crescer com leitura clara.</p></div></section><section className="mt-14">{isLoading && !collections.length ? <div className="grid gap-4 md:grid-cols-2"><div className="h-96 animate-pulse rounded-sm bg-oju-papel md:col-span-2" />{[1,2,3].map(item => <div key={item} className="h-72 animate-pulse rounded-sm bg-oju-papel" />)}</div> : collections.length ? <><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-oju-dende">Coleções publicadas</p><h2 className="mt-2 font-serif text-4xl">Eventos e territórios em imagem</h2></div><p className="text-sm text-oju-terra-suave">{data?.total || collections.length} {data?.total === 1 ? "coleção disponível" : "coleções disponíveis"}</p></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{lead && <CollectionCard collection={lead} featured />}{remaining.map(collection => <CollectionCard key={collection.id} collection={collection} />)}</div>{data?.hasMore && <div className="mt-12 flex justify-center"><button onClick={() => setOffset(current => current + PAGE_SIZE)} disabled={isFetching} className="rounded-sm border border-oju-verde px-6 py-3 text-xs font-bold uppercase tracking-[.08em] text-oju-verde transition hover:bg-oju-verde hover:text-oju-branco disabled:opacity-50">{isFetching ? "Carregando coleções..." : "Carregar mais coleções"}</button></div>}</> : <div className="rounded border border-dashed border-oju-terra/20 bg-oju-paz-claro px-6 py-16 text-center"><Camera className="mx-auto h-7 w-7 text-oju-dende" /><p className="mt-4 font-serif text-3xl">A coleção está em preparação.</p><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-oju-terra-suave">Quando a primeira Fotografia documental for publicada, ela aparecerá aqui como uma coleção editorial.</p></div>}</section></main></div>; }
