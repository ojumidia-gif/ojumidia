import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useRoute } from "wouter";
import { parseWatchStartSeconds } from "@shared/homeMiniclip";
import { trpc } from "@/lib/trpc";

export default function MiniclipWatch() {
  const [, params] = useRoute("/miniclipe/:id");
  const id = Number(params?.id);
  const enabled = Number.isInteger(id) && id > 0;
  const { data, isLoading, error } = trpc.media.publicBackgroundClip.useQuery({ id }, { enabled, retry: false });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startSeconds = typeof window === "undefined" ? 0 : parseWatchStartSeconds(window.location.search);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !startSeconds) return;
    const seek = () => {
      try { video.currentTime = startSeconds; } catch { /* seek before metadata */ }
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
    return () => video.removeEventListener("loadedmetadata", seek);
  }, [data?.assetUrl, startSeconds]);

  if (!enabled) {
    return (
      <div className="cinema-page">
        <PublicHeader cinematic />
        <main className="container pt-32">
          <h1 className="font-serif text-4xl">Miniclipe indisponível.</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/65">Só os miniclipes autorizados para o fundo vivo da Home podem ser assistidos por completo nesta página.</p>
          <Link href="/" className="mt-6 inline-flex gap-2 text-sm font-semibold text-oju-dourado-claro"><ArrowLeft className="h-4 w-4" />Voltar ao portal</Link>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="cinema-page">
        <PublicHeader cinematic />
        <main className="container pt-32">Carregando miniclipe...</main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="cinema-page">
        <PublicHeader cinematic />
        <main className="container pt-32">
          <h1 className="font-serif text-4xl">Miniclipe indisponível.</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/65">Só os miniclipes autorizados para o fundo vivo da Home podem ser assistidos por completo nesta página.</p>
          <Link href="/" className="mt-6 inline-flex gap-2 text-sm font-semibold text-oju-dourado-claro"><ArrowLeft className="h-4 w-4" />Voltar ao portal</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="cinema-page">
      <PageMeta title={`${data.credit ? `${data.credit} — ` : ""}Miniclipe — Ojú Mídia`} description="Miniclipe documental completo, com crédito e autorização para circulação no portal." url={typeof window !== "undefined" ? window.location.href : undefined} />
      <PublicHeader cinematic />
      <main className="container max-w-5xl pb-16 pt-28">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-oju-dourado-claro"><ArrowLeft className="h-4 w-4" />Voltar à Home</Link>
        <h1 className="mt-8 font-serif text-4xl sm:text-5xl">Assistir miniclipe</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Na Home o fundo vivo mostra até 15 segundos de cada clipe. Aqui o arquivo completo permanece disponível, com controles nativos, crédito visível e legenda somente se a casa autorizou o texto.</p>
        <figure className="mt-8 overflow-hidden rounded border border-white/15 bg-black">
          <video ref={videoRef} controls autoPlay playsInline className="aspect-video w-full" src={data.assetUrl} crossOrigin="anonymous">
            {data.captionTrackUrl ? <track kind="subtitles" srcLang="pt" label="Português" src={data.captionTrackUrl} default /> : null}
          </video>
          <figcaption className="px-4 py-3 text-xs text-white/55">{[data.credit, data.origin].filter(Boolean).join(" · ") || "Crédito preservado"}{data.durationSeconds ? ` · ${data.durationSeconds}s` : ""}{data.captionTrackUrl ? " · legenda autorizada" : ""}</figcaption>
        </figure>
      </main>
    </div>
  );
}
