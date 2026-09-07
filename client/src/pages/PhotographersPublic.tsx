import { ArrowRight, Camera } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { AuthorizedInstagram } from "@/components/AuthorizedInstagram";
import { trpc } from "@/lib/trpc";

export default function PhotographersPublic() {
  const { data, isLoading } = trpc.editorial.publicPhotographers.useQuery({ limit: 24, offset: 0 }, { refetchInterval: 30000 });
  const items = data?.items || [];
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="container pb-20 pt-16">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-oju-verde">Rede documental</p>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">Fotógrafos no Ojú</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-oju-terra-suave">Cada ficha pertence à mesma plataforma editorial. O crédito identifica autoria visual; não cria um site separado nem permissão administrativa sobre as publicações.</p>
        {isLoading ? <p className="mt-12 text-oju-terra-suave">Organizando fotógrafos…</p> : items.length ? (
          <section className="mt-12 divide-y divide-oju-terra/10 border-y border-oju-terra/10">
            {items.map(photographer => (
              <Link key={photographer.id} href={`/fotografos/${photographer.slug}`} className="grid gap-4 py-8 transition hover:bg-oju-papel md:grid-cols-[auto_1fr_auto] md:items-end">
                <Camera className="h-6 w-6 text-oju-verde" />
                <div>
                  <h2 className="font-serif text-3xl">{photographer.displayName}</h2>
                  <p className="mt-2 text-sm text-oju-terra-suave">{photographer.specialty}</p>
                  {photographer.profileNote ? <p className="mt-3 max-w-xl line-clamp-2 text-sm leading-6 text-oju-terra-suave">{photographer.profileNote}</p> : null}
                  {photographer.instagramHandle ? <p className="mt-3"><AuthorizedInstagram handle={photographer.instagramHandle} className="text-sm font-semibold text-oju-verde" /></p> : null}
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-oju-verde">Ver no Ojú <ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
          </section>
        ) : (
          <section className="mt-12 border border-dashed border-oju-terra/20 p-10">
            <h2 className="font-serif text-3xl">Ainda não há fotógrafos visíveis no portal.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-oju-terra-suave">A Equipe Ojú publica a ficha a partir da Rede Ojú. Crédito em mídia continua válido mesmo quando a ficha pública ainda não estiver ativa.</p>
          </section>
        )}
      </main>
    </div>
  );
}
