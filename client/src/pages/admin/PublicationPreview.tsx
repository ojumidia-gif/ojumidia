import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function PublicationPreview() {
  const [, params] = useRoute("/admin/preview/:id");
  const { data, isLoading } = trpc.editorial.preview.useQuery({ id: Number(params?.id) }, { enabled: Boolean(params?.id) });
  const cover = data?.media.find(item => item.isCover) || data?.media[0];
  return <div className="min-h-screen bg-[#070605] text-white">
    <div className="border-b border-white/10 bg-black/40 px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link href={params?.id ? `/admin/editar/${params.id}` : "/admin/publicacoes"} className="inline-flex items-center gap-2 text-sm font-semibold text-white/80"><ArrowLeft className="h-4 w-4" />Voltar à edição</Link>
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ed9c58]">Prévia como no site · {data?.status || "…"}</p>
        {params?.id && <Button asChild className="bg-[#ed9c58] text-[#24140b]"><Link href={`/admin/editar/${params.id}`}>Continuar edição</Link></Button>}
      </div>
    </div>
    {isLoading ? <p className="container pt-16">Preparando visualização...</p> : data ? <article className="container max-w-4xl py-16">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ed9c58]">{data.contentKind}</p>
      <h1 className="mt-4 font-serif text-5xl leading-[1.02]">{data.title}</h1>
      {data.subtitle && <p className="mt-5 font-serif text-2xl italic text-white/65">{data.subtitle}</p>}
      {cover?.assetUrl ? <figure className="mt-10 overflow-hidden rounded border border-white/15">{cover.mediaType === "vídeo" ? <video controls className="aspect-video w-full" src={cover.assetUrl} /> : <img src={cover.assetUrl} alt={cover.filename || data.title} className="w-full" />}<figcaption className="px-4 py-3 text-xs text-white/55">Capa · crédito visível no portal</figcaption></figure> : null}
      {data.commercialEditorial && !data.commercialEditorial.authorized ? <aside className="mt-7 border-l-2 border-[#a33a23] bg-[#2a1410] px-5 py-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#ef9e59]">Material contratado em guarda privada</p><p className="mt-2 text-sm leading-6 text-white/65">Não vai ao portal até a autorização editorial expressa.</p></aside> : null}
      {data.taxonomies?.length ? <section className="mt-7"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#ed9c58]">Relações documentais</p><div className="mt-3 flex flex-wrap gap-2">{data.taxonomies.map(item => <span key={item.id} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">{item.dimension} · {item.name}</span>)}</div></section> : null}
      <p className="mt-10 whitespace-pre-wrap font-serif text-xl leading-9 text-white/85">{data.body || data.summary || "Sem texto editorial adicionado."}</p>
      <p className="mt-10 border-t border-white/10 pt-4 text-sm text-white/50">Esta prévia é o mesmo olhar do site. Enquanto o status não for Publicada, o público não vê.</p>
    </article> : <p className="container pt-16">Conteúdo não encontrado.</p>}
  </div>;
}
