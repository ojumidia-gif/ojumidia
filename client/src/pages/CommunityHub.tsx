import { ArrowRight, CalendarDays, HeartHandshake, Landmark, Mic2 } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { portalContentDefaults, type HeroContent, usePortalContent } from "@/lib/portalContent";

type CommunityEntries = { items: Array<{ title: string; description: string; href: string }> };

const icons = [Landmark, CalendarDays, Mic2, HeartHandshake] as const;

export default function CommunityHub() {
  const content = usePortalContent("Comunidade");
  const hero = content.block<HeroContent>("hero", portalContentDefaults.Comunidade.hero as HeroContent);
  const entries = content.block<CommunityEntries>("entries", portalContentDefaults.Comunidade.entries as unknown as CommunityEntries);
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="container pb-20 pt-16">
        {hero && <section className="border-b border-oju-terra/10 pb-12"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">{hero.eyebrow}</p><h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[.94] sm:text-7xl">{hero.title}</h1><p className="mt-7 max-w-2xl text-base leading-7 text-oju-terra-suave">{hero.description}</p></section>}
        {entries && <section className="mt-12 grid gap-px border border-oju-terra/10 md:grid-cols-2">{entries.items.map((entry, index) => { const Icon = icons[index] || Landmark; return <Link key={entry.href} href={entry.href} className="group bg-oju-paz-claro p-7 transition hover:bg-[#17110d] sm:p-9"><Icon className="h-7 w-7 text-oju-dende" aria-hidden="true" /><h2 className="mt-8 font-serif text-3xl">{entry.title}</h2><p className="mt-4 max-w-md text-sm leading-6 text-oju-terra-suave">{entry.description}</p><span className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-oju-dende">Abrir caminho <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>; })}</section>}
        <section className="mt-12 border border-[#ef9e59]/25 bg-[#15100c] p-7 sm:p-10"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">Princípio de visibilidade</p><h2 className="mt-4 max-w-3xl font-serif text-4xl">Nem toda memória precisa ser pública para ser cuidada.</h2><p className="mt-5 max-w-2xl text-sm leading-6 text-oju-terra-suave">A plataforma mantém espaços de acolhimento e organização que não viram exposição. Uma autorização pode ser alterada, reduzida ou revogada conforme os termos definidos.</p></section>
      </main>
    </div>
  );
}
