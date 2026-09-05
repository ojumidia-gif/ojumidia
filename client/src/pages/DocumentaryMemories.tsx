import { ArrowRight, FileText, MapPin, PlayCircle, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { isDocumentaryMemoryKind } from "@/lib/publicArchitecture";
import { portalContentDefaults, type HeroContent, usePortalContent } from "@/lib/portalContent";
import { trpc } from "@/lib/trpc";

export default function DocumentaryMemories() {
  const { data, isLoading } = trpc.editorial.search.useQuery({ limit: 24, offset: 0 }, { refetchInterval: 30000 });
  const memories = (data?.items || []).filter(item => isDocumentaryMemoryKind(item.contentKind)).slice(0, 3);
  const content = usePortalContent("Memórias Documentais");
  const hero = content.block<HeroContent>("hero", portalContentDefaults["Memórias Documentais"].hero as HeroContent);

  return (
    <div className="min-h-screen bg-[#070605] text-white">
      <PublicHeader cinematic />
      <main>
        {hero && <section className="container border-b border-white/10 pb-14 pt-32 sm:pb-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ef9e59]">{hero.eyebrow}</p>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[.94] sm:text-7xl">{hero.title}</h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-white/65">{hero.description}</p>
            </div>
            <aside className="border border-[#ef9e59]/30 bg-[#15100c] p-6">
              <ShieldCheck className="h-7 w-7 text-[#ef9e59]" aria-hidden="true" />
              <h2 className="mt-5 font-serif text-2xl">A contratação continua privada.</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">A presença de um registro nesta área nunca é automática. A Ojú só reúne conteúdos que podem circular no portal conforme suas autorizações editoriais.</p>
            </aside>
          </div>
        </section>}
        <section className="container py-14 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ef9e59]">Seleção em construção</p><h2 className="mt-3 font-serif text-4xl">Três entradas, quando houver história para publicar.</h2></div>
            <Link href="/historias" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-[#ef9e59]">Explorar histórias <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {isLoading ? <p className="mt-12 text-sm text-white/60">Organizando memórias documentais…</p> : memories.length ? (
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {memories.map(memory => (
                <article key={memory.id} className="overflow-hidden border border-white/15 bg-[#100d0a]">
                  {memory.externalVideoUrl ? <video controls preload="metadata" className="aspect-video w-full bg-black object-cover" src={memory.externalVideoUrl} /> : <div className="relative flex aspect-video items-end bg-[radial-gradient(circle_at_75%_15%,rgba(201,125,61,.48),transparent_26%),linear-gradient(135deg,#17110d,#070605)] p-5"><FileText className="h-7 w-7 text-[#ef9e59]" aria-hidden="true" /></div>}
                  <div className="p-6"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ef9e59]">{memory.contentKind}</p><h3 className="mt-3 font-serif text-3xl leading-[1.02]">{memory.title}</h3>{memory.summary && <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/65">{memory.summary}</p>}<p className="mt-5 flex items-center gap-2 text-xs text-white/50"><MapPin className="h-4 w-4 text-[#ef9e59]" />Contexto e créditos na leitura completa</p><Link href={`/historias/${memory.slug}`} className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-[#ef9e59]">Abrir memória <ArrowRight className="h-4 w-4" /></Link></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-10 grid gap-6 border border-dashed border-white/20 bg-[#0c0907] p-8 sm:grid-cols-[auto_1fr] sm:p-12"><PlayCircle className="h-10 w-10 text-[#ef9e59]" aria-hidden="true" /><div><h3 className="font-serif text-3xl">Esta seleção não será preenchida com exemplos inventados.</h3><p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">Quando três registros reais tiverem publicação autorizada, cada entrada poderá reunir vídeo, fotografia, contexto, créditos, território e a história que sustenta sua presença aqui.</p><Link href="/planejar-um-registro" className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-[#ef9e59]">Planejar um registro <ArrowRight className="h-4 w-4" /></Link></div></div>
          )}
        </section>
      </main>
    </div>
  );
}
