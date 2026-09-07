import { ArrowLeft } from "lucide-react";
import { Link, useRoute } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { trpc } from "@/lib/trpc";

export default function NetworkHousePublic() {
  const [, casa] = useRoute("/rede/casas/:slug");
  const [, instituicao] = useRoute("/rede/instituicoes/:slug");
  const slug = casa?.slug || instituicao?.slug || "";
  const directory = trpc.community.publicDirectory.useQuery();
  const house = directory.data?.find(item => item.slug === slug);
  if (directory.isLoading) return <div className="public-page"><PublicHeader /><main className="container pt-16">Carregando casa…</main></div>;
  if (!house) return <div className="public-page"><PublicHeader /><main className="container pt-16"><h1 className="font-serif text-4xl">Esta casa não está pública.</h1><Link href="/rede" className="mt-6 inline-flex gap-2 text-sm font-semibold text-oju-dende"><ArrowLeft className="h-4 w-4" />Voltar à Rede</Link></main></div>;
  return (
    <div className="public-page">
      <PageMeta title={`${house.name} · Rede Ojú`} description={house.description || "Casa, instituição ou iniciativa na Rede Ojú."} url={`/rede/casas/${house.slug}`} />
      <PublicHeader />
      <main className="container pb-20 pt-16">
        <Link href="/rede" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-oju-dende"><ArrowLeft className="h-4 w-4" />Rede Ojú</Link>
        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[.14em] text-oju-verde">{house.institutionType}</p>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">{house.name}</h1>
        {house.territoryName ? <p className="mt-4 text-sm text-oju-terra-suave">{house.territoryName}</p> : null}
        {house.description ? <p className="mt-6 max-w-2xl text-base leading-7 text-oju-terra-suave">{house.description}</p> : null}
        {house.contactText ? <p className="mt-4 text-sm font-semibold text-oju-verde">{house.contactText}</p> : null}
        <Link href="/instituicoes" className="mt-10 inline-flex text-sm font-semibold text-oju-verde">Ver o diretório de casas</Link>
      </main>
    </div>
  );
}
