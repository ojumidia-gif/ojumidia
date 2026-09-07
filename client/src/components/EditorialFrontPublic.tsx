import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicCoverCard, type PublicCoverAccent } from "@/components/PublicCoverCard";
import { trpc } from "@/lib/trpc";

type Front = { kind: "Cobertura" | "Documentário" | "Projeto"; eyebrow: string; title: string; description: string; empty: string };

const accentByKind: Record<Front["kind"], PublicCoverAccent> = {
  Cobertura: "dende",
  Documentário: "indigo",
  Projeto: "paz",
};

export function EditorialFrontPublic({ front }: { front: Front }) {
  const { data, isLoading } = trpc.editorial.search.useQuery({ contentKind: front.kind, limit: 24, offset: 0 }, { refetchInterval: 30000 });
  const contents = data?.items || [];
  const accent = accentByKind[front.kind];
  const featured = front.kind === "Documentário" ? contents[0] : null;
  const rest = featured ? contents.slice(1) : contents;
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="container pb-20 pt-16">
        <p className="editorial-kicker">{front.eyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-serif text-6xl leading-[.95] sm:text-7xl">{front.title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-oju-terra-suave">{front.description}</p>
        {isLoading ? <p className="mt-14 text-oju-terra-suave">Organizando conteúdos...</p> : contents.length ? (
          <div className={`mt-14 grid gap-6 ${front.kind === "Projeto" ? "md:grid-cols-1 lg:grid-cols-2" : "md:grid-cols-2"}`}>
            {featured ? <PublicCoverCard featured accent="indigo" href={`/historias/${featured.slug}`} kicker={front.kind} title={featured.title} summary={featured.summary} coverUrl={featured.coverUrl} coverType={featured.coverType} coverCredit={featured.coverCredit} /> : null}
            {rest.map(content => (
              <PublicCoverCard key={content.id} accent={accent} href={`/historias/${content.slug}`} kicker={front.kind} title={content.title} summary={content.summary} coverUrl={content.coverUrl} coverType={content.coverType} coverCredit={content.coverCredit} />
            ))}
          </div>
        ) : (
          <section className="public-surface mt-14 p-10">
            <p className="font-serif text-3xl">{front.empty}</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-oju-terra-suave">Quando a equipe publicar materiais desta frente, eles aparecerão aqui com texto, fotografia, vídeo e relações documentais conforme o conteúdo.</p>
            <Link href="/planejar-um-registro" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-oju-verde">Chamar a Ojú <ArrowRight className="h-4 w-4" /></Link>
          </section>
        )}
      </main>
    </div>
  );
}
