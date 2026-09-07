import { BookOpenText } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicCoverCard } from "@/components/PublicCoverCard";
import { portalContentDefaults, type HeroContent, usePortalContent } from "@/lib/portalContent";
import { trpc } from "@/lib/trpc";

export default function StoriesPreview() {
  const { data, isLoading } = trpc.editorial.search.useQuery({ contentKind: "História", limit: 24, offset: 0 }, { refetchInterval: 30000 });
  const stories = data?.items || [];
  const content = usePortalContent("Histórias");
  const hero = content.block<HeroContent>("hero", portalContentDefaults.Histórias.hero as HeroContent);
  const featured = stories[0];
  const rest = stories.slice(1);
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="container pb-20 pt-16">
        {hero ? (
          <section className="grid gap-8 border-b border-oju-terra/10 pb-12 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-oju-dende">{hero.eyebrow}</p>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[.94] sm:text-7xl">{hero.title}</h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-oju-terra-suave">{hero.description}</p>
            </div>
            <aside className="border-l border-[#9aacd8]/45 pl-6">
              <BookOpenText className="h-7 w-7 text-oju-verde" />
              <p className="mt-5 font-serif text-2xl">Cada leitura pode levar a outras camadas: tema, território, memória e acervo.</p>
            </aside>
          </section>
        ) : null}
        {isLoading ? <p className="mt-12 text-sm text-oju-terra-suave">Organizando histórias…</p> : stories.length ? (
          <section className="mt-12 grid gap-4 md:grid-cols-2">
            {featured ? <PublicCoverCard featured href={`/historias/${featured.slug}`} kicker="História" title={featured.title} summary={featured.summary} coverUrl={featured.coverUrl} coverType={featured.coverType} coverCredit={featured.coverCredit} /> : null}
            {rest.map(story => (
              <PublicCoverCard key={story.id} href={`/historias/${story.slug}`} kicker="História" title={story.title} summary={story.summary} coverUrl={story.coverUrl} coverType={story.coverType} coverCredit={story.coverCredit} />
            ))}
          </section>
        ) : (
          <section className="mt-12 border border-dashed border-oju-terra/20 bg-oju-papel p-10">
            <h2 className="font-serif text-3xl">A primeira história ainda está sendo preparada.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-oju-terra-suave">A Ojú publica com tempo, revisão e contexto. Quando uma história estiver pronta, ela aparecerá aqui ligada às suas relações documentais.</p>
          </section>
        )}
      </main>
    </div>
  );
}
