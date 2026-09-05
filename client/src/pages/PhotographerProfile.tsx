import { ArrowLeft, ArrowRight, Camera } from "lucide-react";
import { Link, useRoute } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { trpc } from "@/lib/trpc";

export default function PhotographerProfile() {
  const [, params] = useRoute("/fotografos/:slug");
  const { data, isLoading } = trpc.editorial.photographerBySlug.useQuery({ slug: params?.slug || "", limit: 12, offset: 0 }, { enabled: Boolean(params?.slug), refetchInterval: 30000 });
  if (isLoading) return <div className="min-h-screen bg-[#070605] text-white"><PublicHeader cinematic /><main className="container pt-32">Carregando ficha…</main></div>;
  if (!data?.photographer) return <div className="min-h-screen bg-[#070605] text-white"><PublicHeader cinematic /><main className="container pt-32"><h1 className="font-serif text-4xl">Fotógrafo indisponível.</h1><Link href="/fotografos" className="mt-6 inline-flex gap-2 text-sm font-semibold text-[#ef9e59]"><ArrowLeft className="h-4 w-4" />Ver fotógrafos</Link></main></div>;
  const photographer = data.photographer;
  return (
    <div className="min-h-screen bg-[#070605] text-white">
      <PublicHeader cinematic />
      <main className="container pb-20 pt-32">
        <Link href="/fotografos" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-[#ef9e59]"><ArrowLeft className="h-4 w-4" />Fotógrafos no Ojú</Link>
        <p className="mt-8 text-[10px] font-bold uppercase tracking-[.14em] text-[#ef9e59]">Autoria visual</p>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">{photographer.displayName}</h1>
        <p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-white/50">{photographer.specialty}</p>
        {photographer.profileNote ? <p className="mt-6 max-w-2xl text-base leading-7 text-white/70">{photographer.profileNote}</p> : null}
        <p className="mt-6 max-w-2xl text-sm leading-6 text-white/50">Esta página reúne conteúdos do Ojú em que a fotografia foi creditada a esta pessoa. Não é um portfólio independente.</p>
        <section className="mt-14">
          <div className="mb-6 flex items-center gap-3"><Camera className="h-5 w-5 text-[#ef9e59]" /><h2 className="font-serif text-3xl">No acervo editorial</h2></div>
          {data.items.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.items.map(item => (
                <Link key={item.id} href={`/historias/${item.slug}`} className="border border-white/15 bg-[#100d0a] p-5 transition hover:border-[#ef9e59]/75">
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ef9e59]">{item.contentKind}</p>
                  <h3 className="mt-3 font-serif text-2xl">{item.title}</h3>
                  {item.summary ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/65">{item.summary}</p> : null}
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-[#ef9e59]">Ler no Ojú <ArrowRight className="h-4 w-4" /></span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="border border-dashed border-white/20 p-8 text-sm text-white/60">Ainda não há publicações visíveis com crédito deste fotógrafo.</p>
          )}
        </section>
      </main>
    </div>
  );
}
