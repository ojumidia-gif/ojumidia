import { ArrowLeft } from "lucide-react";
import { Link, useRoute } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { trpc } from "@/lib/trpc";

export default function NetworkPartnerPublic() {
  const [, params] = useRoute("/rede/parceiros/:slug");
  const slug = params?.slug || "";
  const { data, isLoading } = trpc.networkDirectory.publicPartner.useQuery({ slug }, { enabled: Boolean(slug) });
  if (isLoading) return <div className="public-page"><PublicHeader /><main className="container pt-16">Carregando parceiro da Rede…</main></div>;
  if (!data?.partner) return <div className="public-page"><PublicHeader /><main className="container pt-16"><h1 className="font-serif text-4xl">Este parceiro não está público.</h1><Link href="/rede" className="mt-6 inline-flex gap-2 text-sm font-semibold text-oju-dende"><ArrowLeft className="h-4 w-4" />Voltar à Rede</Link></main></div>;
  const partner = data.partner;
  return (
    <div className="public-page">
      <PageMeta title={`${partner.displayName} · Rede Ojú`} description={partner.description || "Parceiro Ojú com presença territorial autorizada."} url={data.canonical} />
      <PublicHeader />
      <main className="container pb-20 pt-16">
        <Link href="/rede" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-oju-dende"><ArrowLeft className="h-4 w-4" />Rede Ojú</Link>
        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[.14em] text-oju-verde">Parceiro Ojú</p>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">{partner.displayName}</h1>
        {partner.description ? <p className="mt-6 max-w-2xl text-base leading-7 text-oju-terra-suave">{partner.description}</p> : null}
        <p className="mt-6 max-w-2xl text-sm leading-6 text-oju-terra-suave">Presença territorial da Rede. Não é vitrine paga nem ranking.</p>
        <Link href="/ser-parceiro" className="mt-10 inline-flex text-sm font-semibold text-oju-verde">Seja parceiro</Link>
      </main>
    </div>
  );
}
