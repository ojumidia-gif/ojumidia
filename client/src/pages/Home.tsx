import { ArrowRight, Camera, Play, Volume2, VolumeX } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { HOME_MINICLIP_SEQUENCE_LIMIT, HOME_MINICLIP_TRANSITION_MS } from "@shared/const";
import { buildMiniclipWatchUrl, persistHomeMiniclipMutedPreference, sessionStorageOrNull } from "@shared/homeMiniclip";
import { trpc } from "@/lib/trpc";
import { useEditorialLive } from "@/hooks/useEditorialLive";
import { useHomeMiniclipPlayback } from "@/hooks/useHomeMiniclipPlayback";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { OjuMethod } from "@/components/OjuMethod";
import { portalContentDefaults, type HeroContent, usePortalContent } from "@/lib/portalContent";
import { PageMeta } from "@/components/PageMeta";
import { PublicCoverCard } from "@/components/PublicCoverCard";
import { firebasePreviewAssets, isStaticFirebasePreview } from "@/lib/runtimeMode";

const FALLBACK_HERO_VIDEO = "/oju-assets/orixas-transicao-ritual-cinematografica.mp4";

function FrontCard({ label, title, action, href }: { label: string; title: string; action: string; href: string }) {
  return (
    <Link
      href={href}
      aria-label={action}
      className="group relative z-[1] min-h-36 overflow-hidden border border-oju-terra/12 bg-oju-paz-claro p-5 text-oju-terra scroll-mt-8 hover:border-oju-dourado/50"
    >
      <p className="editorial-kicker">{label}</p>
      <h3 className="mt-3 max-w-none font-serif text-2xl leading-[1.05] sm:max-w-[15rem]">{title}</h3>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-oju-verde">{action} <ArrowRight className="h-4 w-4 group-hover:translate-x-1" /></span>
    </Link>
  );
}
type FeaturedContent = { eyebrow: string; title: string; emptyMessage: string; allLabel: string; allHref: string };
type EditorialFrontsContent = { items: Array<{ label: string; title: string; action: string; href: string }> };

export default function Home() {
  const { data: items } = trpc.editorial.featured.useQuery({}, { refetchInterval: 5000 });
  const { data: livingBackgrounds } = trpc.media.homeBackgrounds.useQuery(undefined, { refetchInterval: 30000 });
  trpc.media.homeBackgroundConfig.useQuery(undefined, { refetchInterval: 30000 });
  const { data: activeAds } = trpc.commercial.activeAds.useQuery(undefined, { refetchInterval: 30000 });
  const [isMuted, setIsMuted] = useState(true);
  const [adminTapCount, setAdminTapCount] = useState(0);
  const adminTapAt = useRef(0);
  const [, setLocation] = useLocation();
  const heroVideoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const recordSignal = trpc.media.recordHomeMiniclipSignal.useMutation();
  const utils = trpc.useUtils();
  useEditorialLive(() => { utils.editorial.featured.invalidate(); utils.media.homeBackgrounds.invalidate(); utils.media.homeBackgroundConfig.invalidate(); });
  const content = usePortalContent("Home");
  const hero = content.block<HeroContent>("hero", portalContentDefaults.Home.hero as HeroContent);
  const planning = content.block<HeroContent>("planning", portalContentDefaults.Home.planning as HeroContent);
  const featured = content.block<FeaturedContent>("featured", portalContentDefaults.Home.featured as FeaturedContent);
  const editorialFronts = content.block<EditorialFrontsContent>("editorialFronts", portalContentDefaults.Home.editorialFronts as unknown as EditorialFrontsContent);
  const heroVideos = useMemo(() => {
    if (isStaticFirebasePreview) return [{ id: undefined as number | undefined, mediaType: "vídeo" as const, assetUrl: firebasePreviewAssets.heroVideoUrl, credit: undefined as string | undefined }];
    const curated = (livingBackgrounds || []).filter(item => item.mediaType === "vídeo" && item.assetUrl).slice(0, HOME_MINICLIP_SEQUENCE_LIMIT);
    return curated.length ? curated : [{ id: undefined as number | undefined, mediaType: "vídeo" as const, assetUrl: FALLBACK_HERO_VIDEO, credit: undefined as string | undefined }];
  }, [livingBackgrounds]);
  const sequenceKey = heroVideos.map(video => video.id ?? video.assetUrl).join("|");
  const { heroIndex, preloadNext, nextIndex, selectIndex } = useHomeMiniclipPlayback(heroVideos.length, sequenceKey, isMuted, heroVideoRefs);
  const heroVideo = heroVideos[heroIndex % Math.max(heroVideos.length, 1)];
  const transitionMilliseconds = HOME_MINICLIP_TRANSITION_MS;
  const cards = items?.slice(0, 4) || [];
  const emitCurationSignal = (action: "watch" | "mute" | "unmute", mediaId?: number) => {
    if (isStaticFirebasePreview) return;
    if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;
    recordSignal.mutate({ action, mediaId });
  };
  const playHero = () => {
    const current = heroVideos[heroIndex];
    if (!current?.assetUrl) return;
    const currentTime = heroVideoRefs.current[heroIndex]?.currentTime || 0;
    window.open(buildMiniclipWatchUrl(current.id, current.assetUrl, currentTime), "_blank", "noopener,noreferrer");
    emitCurationSignal("watch", current.id);
  };
  const toggleMute = () => {
    setIsMuted(muted => {
      const nextMuted = !muted;
      persistHomeMiniclipMutedPreference(nextMuted, sessionStorageOrNull());
      emitCurationSignal(nextMuted ? "mute" : "unmute", heroVideos[heroIndex]?.id);
      return nextMuted;
    });
  };
  const signalAdminEntry = () => {
    const now = Date.now();
    const next = now - adminTapAt.current < 2200 ? adminTapCount + 1 : 1;
    adminTapAt.current = now;
    setAdminTapCount(next);
    if (next >= 5) { setAdminTapCount(0); setLocation("/admin"); }
  };

  return (
    <div className="public-page">
      <PageMeta title="Ojú Mídia — memória negra, casa e chão" description="Documentação afro-brasileira e de religiosidades de matriz africana, com crédito, território e autorização." />
      <main>
        <section className="relative min-h-[min(92svh,680px)] overflow-hidden border-b border-white/10 bg-oju-preto-filme text-oju-branco sm:min-h-[680px]">
          <PublicHeader cinematic includeSiteFooter={false} />
          {heroVideos.map((video, index) => (
            <video
              key={video.id ?? video.assetUrl}
              ref={element => { heroVideoRefs.current[index] = element; }}
              muted={isMuted || index !== heroIndex}
              playsInline
              preload={index === heroIndex || (preloadNext && index === nextIndex) ? "auto" : "metadata"}
              className="absolute inset-0 h-full w-full object-cover transition-opacity ease-out"
              style={{ opacity: index === heroIndex ? 1 : 0, transitionDuration: `${transitionMilliseconds}ms` }}
              src={video.assetUrl}
            />
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,6,5,.94)_0%,rgba(7,6,5,.72)_39%,rgba(7,6,5,.18)_72%,rgba(7,6,5,.5)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,6,5,.7),transparent_38%)]" />
          <div className="relative container flex min-h-[min(92svh,680px)] items-end pb-24 pt-28 sm:min-h-[680px] sm:pb-20 sm:pt-32">
            {hero && (
              <div className="max-w-xl">
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-oju-dourado-claro">{hero.eyebrow}</p>
                <h1 className="mt-5 break-words font-serif text-4xl leading-[.95] tracking-tight sm:text-7xl">{hero.title}</h1>
                <p className="mt-6 max-w-md text-base leading-7 text-white/80">{hero.description}</p>
                <div className="mt-8 flex flex-wrap items-center gap-5">
                  {hero.ctaLabel && hero.ctaHref && (
                    <Link href={hero.ctaHref} className="public-cta">{hero.ctaLabel} <ArrowRight className="h-5 w-5" /></Link>
                  )}
                  {hero.secondaryLabel && hero.secondaryHref && (
                    <Link href={hero.secondaryHref} className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[.08em] text-white">
                      <span className="grid h-9 w-9 place-items-center rounded-full border border-white/80"><Play className="ml-0.5 h-4 w-4" /></span>
                      {hero.secondaryLabel}
                    </Link>
                  )}
                  {heroVideo?.assetUrl ? <button type="button" onClick={playHero} className="text-xs font-bold uppercase tracking-[.08em] text-white/70">Assistir miniclipe</button> : null}
                </div>
              </div>
            )}
          </div>
          <div className="absolute inset-x-4 bottom-4 z-10 flex items-end justify-between gap-3 sm:inset-x-7 sm:bottom-7">
            {heroVideo?.credit ? (
              <p className="min-w-0 max-w-[58%] text-[10px] font-bold uppercase tracking-[.08em] text-white/55 sm:max-w-xs sm:tracking-[.12em]" aria-live="polite">Vídeo · {heroVideo.credit}</p>
            ) : <span />}
            {heroVideo?.assetUrl ? (
              <div className="flex shrink-0 items-center gap-2 text-white/80 sm:gap-3">
                {heroVideos.map((video, index) => (
                  <button type="button" key={video.id ?? video.assetUrl} onClick={() => selectIndex(index)} className={`h-2 w-2 rounded-full ${index === heroIndex ? "bg-oju-dourado" : "bg-white/60"}`} aria-label={`Exibir miniclipe ${index + 1}`} />
                ))}
                <button type="button" onClick={toggleMute} className="ml-3 grid h-9 w-9 place-items-center rounded-full border border-white/60 sm:ml-6" aria-pressed={!isMuted} aria-label={isMuted ? "Ativar som do miniclipe" : "Silenciar miniclipe"}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <p className="hero-admin-hint max-w-[42%] text-right text-[10px] font-bold uppercase tracking-[.12em] text-white/55">Ative um miniclipe autorizado no Centro Administrativo.</p>
            )}
          </div>
        </section>

        {featured && (
          <section className="container py-16 sm:py-20">
            <div className="mb-10 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="editorial-kicker">{featured.eyebrow}</p>
                <h2 className="mt-2 font-serif text-3xl sm:text-4xl">{featured.title}</h2>
              </div>
              <Link href={featured.allHref} className="inline-flex items-center gap-2 text-sm font-semibold text-oju-verde">{featured.allLabel} <ArrowRight className="h-4 w-4" /></Link>
            </div>
            {cards.length ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map(item => (
                  <PublicCoverCard key={item.id} href={`/historias/${item.slug}`} kicker={item.contentKind} title={item.title} meta={[item.territoryName, item.photographerName].filter(Boolean).join(" · ") || "Ver conteúdo"} coverUrl={item.coverUrl} coverType={item.coverType} coverCredit={item.coverCredit} />
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-oju-terra/20 px-6 py-12 text-center text-sm text-oju-terra-suave">{featured.emptyMessage}</div>
            )}
          </section>
        )}

        {editorialFronts && (
          <section className="container grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
            {editorialFronts.items.map(entry => <FrontCard key={entry.href} {...entry} />)}
          </section>
        )}

        <OjuMethod compact />

        {activeAds?.length ? (
          <section className="border-y border-oju-terra/10 bg-oju-papel">
            <div className="container py-16">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="editorial-kicker">Divulgação contratada</p>
                  <h2 className="mt-2 font-serif text-3xl">Serviços e parceiros</h2>
                </div>
                <p className="max-w-sm text-xs leading-5 text-oju-terra-suave">Este espaço comercial é identificado e não integra a curadoria editorial.</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {activeAds.map(ad => (
                  <article key={ad.id} className="overflow-hidden border border-oju-terra/12 bg-oju-paz-claro">
                    {ad.mediaUrl && (ad.mediaType === "vídeo"
                      ? <video muted autoPlay loop playsInline className="aspect-[16/9] w-full object-cover" src={ad.mediaUrl} />
                      : <img className="aspect-[16/9] w-full object-cover" src={ad.mediaUrl} alt={ad.title} />)}
                    <div className="p-5">
                      <p className="editorial-kicker">Divulgação contratada · {ad.format}</p>
                      <h3 className="mt-3 font-serif text-2xl">{ad.title}</h3>
                      {ad.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-oju-terra-suave">{ad.description}</p>}
                      <a href={ad.contact.startsWith("http") ? ad.contact : `https://wa.me/${ad.contact.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-oju-verde">Entrar em contato <ArrowRight className="h-4 w-4" /></a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {planning && (
          <section className="container pb-20 pt-16">
            <div className="grid gap-6 border border-oju-verde/20 bg-oju-verde-profundo p-8 text-oju-branco sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <Camera className="h-12 w-12 text-oju-dourado-claro" />
              <div>
                <h2 className="font-serif text-3xl">{planning.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">{planning.description}</p>
              </div>
              {planning.ctaLabel && planning.ctaHref && (
                <Link href={planning.ctaHref} className="inline-flex w-full items-center justify-center gap-3 bg-oju-paz px-6 py-4 text-xs font-bold uppercase tracking-[.08em] text-oju-verde-profundo sm:w-auto">{planning.ctaLabel} <ArrowRight className="h-5 w-5" /></Link>
              )}
            </div>
          </section>
        )}
      </main>
      <PublicFooter cinematic={false} onBrandClick={signalAdminEntry} />
    </div>
  );
}
