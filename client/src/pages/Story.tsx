import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { EditorialBody } from "@/components/EditorialBody";
import { AuthorizedInstagram } from "@/components/AuthorizedInstagram";
import { ArrowLeft, MapPin, Share2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEditorialLive } from "@/hooks/useEditorialLive";
import { parseEditorialBody } from "@/lib/editorialBody";
import { CompleteProductionLinks } from "@/components/CompleteProductionLinks";

type StoryMedia = {
  id: number;
  assetUrl: string;
  mediaType: "foto" | "vídeo";
  credit?: string | null;
  origin?: string | null;
  isCover?: boolean;
  photographer?: { displayName: string; slug?: string | null; instagramHandle?: string | null } | null;
};

function MediaCredit({ media }: { media: StoryMedia }) {
  return (
    <figcaption className="px-4 py-3 text-sm leading-6 text-white/70">
      {media.photographer?.slug ? <Link href={`/fotografos/${media.photographer.slug}`} className="text-oju-dourado-claro">{media.photographer.displayName}</Link> : media.credit}
      {media.photographer?.instagramHandle ? <> · <AuthorizedInstagram handle={media.photographer.instagramHandle} className="text-oju-dourado-claro" /></> : null}
      {media.origin ? ` · ${media.origin}` : ""}
    </figcaption>
  );
}

function StoryFigure({ media, alt }: { media: StoryMedia; alt: string }) {
  return (
    <figure className="overflow-hidden border border-white/12 bg-black">
      {media.mediaType === "vídeo" ? <video controls className="aspect-video w-full" src={media.assetUrl} /> : <img src={media.assetUrl} alt={alt} className="w-full object-cover" />}
      <MediaCredit media={media} />
      <Link href={`/licenciar-midia?mid=${media.id}`} className="block border-t border-white/10 px-4 py-3 text-[11px] font-semibold tracking-[.08em] text-oju-dourado-claro">Solicitar uso desta mídia</Link>
    </figure>
  );
}

export default function Story() {
  const [, params] = useRoute("/historias/:slug");
  const { data, isLoading } = trpc.editorial.bySlug.useQuery({ slug: params?.slug || "" }, { enabled: Boolean(params?.slug), refetchInterval: 30000 });
  const utils = trpc.useUtils();
  useEditorialLive(() => { utils.editorial.bySlug.invalidate(); });
  if (isLoading) return <div className="public-page"><PublicHeader /><main className="container pt-16">Carregando conteúdo...</main></div>;
  if (!data) return <div className="public-page"><PublicHeader /><main className="container pt-16"><h1 className="font-serif text-4xl">Conteúdo indisponível.</h1><Link href="/" className="mt-6 inline-flex gap-2 text-sm font-semibold text-oju-verde"><ArrowLeft className="h-4 w-4" />Voltar ao portal</Link></main></div>;
  const cover = (data.media.find(item => item.isCover) || data.media[0]) as StoryMedia | undefined;
  const remainingMedia = data.media.filter(item => item.id !== cover?.id) as StoryMedia[];
  const territory = data.taxonomies.find(item => item.dimension === "Território");
  const house = data.taxonomies.find(item => item.dimension === "Pessoa/organização");
  const bodyText = data.body || data.summary || "";
  const blocks = parseEditorialBody(bodyText);
  const share = async () => {
    const url = window.location.href;
    const payload = { title: `${data.title} — Ojú Mídia`, text: [data.summary, cover?.credit ? `Crédito: ${cover.credit}` : null].filter(Boolean).join(" · "), url };
    try {
      if (navigator.share) await navigator.share(payload);
      else await navigator.clipboard.writeText(url);
    } catch { /* cancelamento do compartilhamento */ }
  };
  const coverAlt = [cover?.credit, territory?.name, data.title].filter(Boolean).join(" — ") || data.title;
  const leftoverMedia = [...remainingMedia];
  const reading = blocks.map((block, index) => {
    const takePhoto = leftoverMedia.length > 0 && (index % 2 === 1 || index === blocks.length - 1);
    return { block, photo: takePhoto ? leftoverMedia.shift() : undefined };
  });
  return (
    <div className="public-page">
      <PageMeta title={`${data.title} — Ojú Mídia`} description={data.summary || data.subtitle || "Registro documental da Ojú Mídia, com crédito e autorização."} image={cover?.assetUrl} url={typeof window !== "undefined" ? window.location.href : undefined} />
      <PublicHeader />
      <article>
        <section className="relative overflow-hidden border-b border-oju-terra/10 pt-4">
          <div className="container grid gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,.92fr)]">
            <div className="self-end">
              <p className="editorial-kicker">{data.contentKind}</p>
              <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[.95] sm:text-7xl">{data.title}</h1>
              {data.subtitle ? <p className="mt-6 max-w-2xl font-serif text-2xl leading-snug text-oju-terra-suave">{data.subtitle}</p> : null}
              <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-oju-terra-suave">
                <MapPin className="h-4 w-4 text-oju-dourado" />
                {[territory?.name, house?.name].filter(Boolean).join(" · ") || "Cidade preservada"}
                <span>· {data.publishedAt ? new Date(data.publishedAt).toLocaleDateString("pt-BR") : "preparação editorial"}</span>
              </p>
              <button type="button" onClick={share} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-oju-verde"><Share2 className="h-4 w-4" />Partilhar com crédito</button>
            </div>
            {cover ? <StoryFigure media={cover} alt={coverAlt} /> : null}
          </div>
        </section>
        <section className="border-b border-oju-terra/10 bg-oju-papel">
          <div className="container max-w-4xl space-y-4 py-10">
            {data.editorialAuthorization?.authorized ? (
              <aside className="border-l-2 border-oju-verde bg-oju-paz-claro px-5 py-4">
                <p className="editorial-kicker">Cobertura autorizada editorialmente</p>
                <p className="mt-2 text-sm leading-6 text-oju-terra-suave">A contratação permanece privada; somente o conteúdo autorizado integra o acervo.</p>
              </aside>
            ) : null}
            {data.sponsored ? (
              <aside className="border-l-2 border-oju-dourado bg-oju-paz-claro px-5 py-4">
                <p className="editorial-kicker">Divulgação contratada</p>
                <p className="mt-2 text-sm leading-6 text-oju-terra-suave">{data.sponsorDisclosure || "Conteúdo identificado com transparência pela Ojú Mídia."}</p>
              </aside>
            ) : null}
            <aside className="border-l-2 border-oju-dende bg-oju-paz-claro px-5 py-4">
              <p className="editorial-kicker">O que este registro não mostra</p>
              <p className="mt-2 text-sm leading-6 text-oju-terra-suave">Nomes, pontos, cantos e o que a casa não autorizou permanecem fora da imagem. A Ojú publica só o que pode circular.</p>
            </aside>
          </div>
        </section>
        <section className="container max-w-4xl py-14 sm:py-16">
          {data.taxonomies?.length ? (
            <div className="mb-10 flex flex-wrap gap-2">
              {data.taxonomies.map(item => item.dimension === "Território" && item.slug ? (
                <Link key={item.id} href={`/territorios/${item.slug}`} className="rounded-sm border border-oju-terra/15 px-3 py-1 text-xs text-oju-verde">{item.dimension} · {item.name}</Link>
              ) : (
                <span key={item.id} className="rounded-sm border border-oju-terra/15 px-3 py-1 text-xs text-oju-terra-suave">{item.dimension} · {item.name}</span>
              ))}
            </div>
          ) : null}
          {reading.length ? reading.map((entry, index) => (
              <div key={index}>
                {entry.block.type === "h2" ? <h2 className="mb-4 mt-12 font-serif text-3xl" dangerouslySetInnerHTML={{ __html: entry.block.html }} /> : null}
                {entry.block.type === "quote" ? <blockquote className="my-8 border-l-2 border-oju-dourado pl-5 font-serif text-[1.35rem] leading-snug text-oju-terra" dangerouslySetInnerHTML={{ __html: entry.block.html }} /> : null}
                {entry.block.type === "p" ? <p className="mb-6 max-w-[42rem] font-serif text-[1.15rem] leading-[1.85] text-oju-terra" dangerouslySetInnerHTML={{ __html: entry.block.html }} /> : null}
                {entry.photo ? <div className="my-10"><StoryFigure media={entry.photo} alt={entry.photo.credit || data.title} /></div> : null}
              </div>
            )) : <EditorialBody text={bodyText} />}
          {leftoverMedia.map(media => <div key={media.id} className="mt-10"><StoryFigure media={media} alt={media.credit || data.title} /></div>)}
          <CompleteProductionLinks links={data.completeProductions} />
        </section>
      </article>
    </div>
  );
}
