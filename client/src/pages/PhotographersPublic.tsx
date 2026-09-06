import { ArrowRight, Camera } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { AuthorizedInstagram } from "@/components/AuthorizedInstagram";
import { trpc } from "@/lib/trpc";

export default function PhotographersPublic() {
  const { data, isLoading } = trpc.editorial.publicPhotographers.useQuery({ limit: 24, offset: 0 }, { refetchInterval: 30000 });
  const items = data?.items || [];
  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <PublicHeader cinematic />
      <main className="container pb-20 pt-32">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#9aacd8]">Rede documental</p>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">Fotógrafos no Ojú</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white/65">Cada ficha pertence à mesma plataforma editorial. O crédito identifica autoria visual; não cria um site separado nem permissão administrativa sobre as publicações.</p>
        {isLoading ? <p className="mt-12 text-white/60">Organizando fotógrafos…</p> : items.length ? (
          <section className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {items.map(photographer => (
              <Link key={photographer.id} href={`/fotografos/${photographer.slug}`} className="grid gap-4 py-8 transition hover:bg-white/[0.03] md:grid-cols-[auto_1fr_auto] md:items-end">
                <Camera className="h-6 w-6 text-[#9aacd8]" />
                <div>
                  <h2 className="font-serif text-3xl">{photographer.displayName}</h2>
                  <p className="mt-2 text-sm text-white/50">{photographer.specialty}</p>
                  {photographer.profileNote ? <p className="mt-3 max-w-xl line-clamp-2 text-sm leading-6 text-white/70">{photographer.profileNote}</p> : null}
                  {photographer.instagramHandle ? <p className="mt-3"><AuthorizedInstagram handle={photographer.instagramHandle} className="text-sm font-semibold text-[#9aacd8]" /></p> : null}
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#9aacd8]">Ver no Ojú <ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
          </section>
        ) : (
          <section className="mt-12 border border-dashed border-white/20 p-10">
            <h2 className="font-serif text-3xl">Ainda não há fotógrafos visíveis no portal.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">A Equipe Ojú publica a ficha a partir da Rede Ojú. Crédito em mídia continua válido mesmo quando a ficha pública ainda não estiver ativa.</p>
          </section>
        )}
      </main>
    </div>
  );
}
