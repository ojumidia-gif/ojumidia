import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useRoute } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { trpc } from "@/lib/trpc";

export default function NetworkProfessionalPublic() {
  const [, params] = useRoute("/rede/profissionais/:slug");
  const slug = params?.slug || "";
  const { data, isLoading } = trpc.networkDirectory.publicProfessional.useQuery({ slug }, { enabled: Boolean(slug) });
  if (isLoading) return <div className="public-page"><PublicHeader /><main className="container pt-16">Carregando presença na Rede…</main></div>;
  if (!data?.profile) return <div className="public-page"><PublicHeader /><main className="container pt-16"><h1 className="font-serif text-4xl">Esta presença não está pública.</h1><Link href="/rede" className="mt-6 inline-flex gap-2 text-sm font-semibold text-oju-dende"><ArrowLeft className="h-4 w-4" />Voltar à Rede</Link></main></div>;
  const profile = data.profile;
  return (
    <div className="public-page">
      <PageMeta title={`${profile.displayName} · Rede Ojú`} description={profile.bio || `Presença territorial de ${profile.displayName} na Rede Ojú.`} url={data.canonical} />
      <PublicHeader />
      <main className="container pb-20 pt-16">
        <Link href="/rede/profissionais" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-oju-dende"><ArrowLeft className="h-4 w-4" />Profissionais da Rede</Link>
        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[.14em] text-oju-verde">{profile.bond}</p>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">{profile.displayName}</h1>
        <p className="mt-4 text-sm text-oju-terra-suave">{profile.specialties.map(item => item.label).join(" · ")}{profile.territoryName ? ` · ${profile.territoryName}` : ""}</p>
        {profile.bio ? <p className="mt-6 max-w-2xl text-base leading-7 text-oju-terra-suave">{profile.bio}</p> : null}
        {profile.contact ? <p className="mt-4 text-sm font-semibold text-oju-verde">{profile.contact}</p> : null}
        <p className="mt-6 max-w-2xl text-sm leading-6 text-oju-terra-suave">Esta página é presença na Rede, não um portfólio. A janela pública permanece {data.window.photos} fotografias e {data.window.miniclips} miniclip de até {data.window.seconds} segundos, sempre com contexto.</p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-oju-terra-suave">Não há ranking, preço público nem contratação instantânea. A Ojú analisa o pedido com o território e a especialidade desta presença.</p>
        <Link href={`/contrate-sua-cobertura?profissional=${encodeURIComponent(profile.slug || slug)}`} className="mt-8 inline-flex items-center gap-2 rounded bg-oju-verde px-5 py-3 text-sm font-bold text-oju-branco">Solicitar serviço</Link>
        <section className="mt-12">
          <h2 className="font-serif text-3xl">Histórias e produções visíveis</h2>
          {data.stories.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {data.stories.map(item => (
                <Link key={item.id} href={item.href} className="border border-oju-terra/12 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-oju-dende">{item.contentKind}</p>
                  <h3 className="mt-3 font-serif text-2xl">{item.title}</h3>
                  {item.summary ? <p className="mt-3 line-clamp-3 text-sm text-oju-terra-suave">{item.summary}</p> : null}
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-oju-dende">Ler no Ojú <ArrowRight className="h-4 w-4" /></span>
                </Link>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-oju-terra-suave">Ainda não há publicação contextual autorizada ligada a esta presença.</p>}
        </section>
      </main>
    </div>
  );
}
