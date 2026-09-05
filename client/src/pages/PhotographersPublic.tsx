import { ArrowRight, Camera } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { trpc } from "@/lib/trpc";

export default function PhotographersPublic() {
  const { data, isLoading } = trpc.editorial.publicPhotographers.useQuery({ limit: 24, offset: 0 }, { refetchInterval: 30000 });
  const items = data?.items || [];
  return (
    <div className="min-h-screen bg-[#070605] text-white">
      <PublicHeader cinematic />
      <main className="container pb-20 pt-32">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ef9e59]">Rede documental</p>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">Fotógrafos no Ojú</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white/65">Cada ficha pertence à mesma plataforma editorial. O crédito identifica autoria visual; não cria um site separado nem permissão administrativa sobre as publicações.</p>
        {isLoading ? <p className="mt-12 text-white/60">Organizando fotógrafos…</p> : items.length ? (
          <section className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map(photographer => (
              <Link key={photographer.id} href={`/fotografos/${photographer.slug}`} className="border border-white/15 bg-[#100d0a] p-6 transition hover:border-[#ef9e59]/75">
                <Camera className="h-6 w-6 text-[#ef9e59]" />
                <h2 className="mt-5 font-serif text-3xl">{photographer.displayName}</h2>
                <p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-white/50">{photographer.specialty}</p>
                {photographer.profileNote ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/65">{photographer.profileNote}</p> : null}
                <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-[#ef9e59]">Ver no Ojú <ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
          </section>
        ) : (
          <section className="mt-12 border border-dashed border-white/20 p-10">
            <h2 className="font-serif text-3xl">Ainda não há fotógrafos visíveis no portal.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">O Super Admin publica a ficha a partir da Rede Ojú. Crédito em mídia continua válido mesmo quando a ficha pública ainda não estiver ativa.</p>
          </section>
        )}
      </main>
    </div>
  );
}
