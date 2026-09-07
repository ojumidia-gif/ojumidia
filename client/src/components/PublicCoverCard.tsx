import { Link } from "wouter";

export type PublicCoverAccent = "dende" | "indigo" | "paz";

const kickerColor: Record<PublicCoverAccent, string> = {
  dende: "text-oju-dourado-claro",
  indigo: "text-oju-dourado-claro",
  paz: "text-oju-dourado-claro",
};

export function PublicCoverCard({
  href,
  kicker,
  title,
  summary,
  meta,
  coverUrl,
  coverType,
  coverCredit,
  featured = false,
  accent = "dende",
}: {
  href: string;
  kicker: string;
  title: string;
  summary?: string | null;
  meta?: string | null;
  coverUrl?: string | null;
  coverType?: string | null;
  coverCredit?: string | null;
  featured?: boolean;
  accent?: PublicCoverAccent;
}) {
  return (
    <Link href={href} className={`group relative block overflow-hidden border border-oju-terra/10 bg-oju-preto-filme text-oju-branco ${featured ? "min-h-[24rem] sm:min-h-[28rem] md:col-span-2" : "min-h-72"}`}>
      {coverUrl ? (
        coverType === "vídeo" ? (
          <video muted autoPlay loop playsInline className="absolute inset-0 h-full w-full object-cover" src={coverUrl} />
        ) : (
          <img src={coverUrl} alt={coverCredit || title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )
      ) : (
        <div className="absolute inset-0 bg-oju-preto-suave" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="relative flex h-full flex-col justify-end p-5 sm:p-6">
        <p className={`text-[11px] font-semibold uppercase tracking-[.12em] ${kickerColor[accent]}`}>{kicker}</p>
        <h2 className={`mt-3 font-serif leading-[1.04] ${featured ? "max-w-3xl text-4xl sm:text-5xl" : "text-3xl"}`}>{title}</h2>
        {summary ? <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-6 text-white/82">{summary}</p> : null}
        {meta ? <p className="mt-3 text-xs text-white/70">{meta}</p> : null}
      </div>
    </Link>
  );
}
