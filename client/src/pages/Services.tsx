import { ArrowRight, Check, CircleDot } from "lucide-react";
import { Link } from "wouter";
import { OjuMethod } from "@/components/OjuMethod";
import { PublicHeader } from "@/components/PublicHeader";
import { portalContentDefaults, type HeroContent, usePortalContent } from "@/lib/portalContent";

type ServicesContent = { eyebrow: string; title: string; items: Array<{ title: string; description: string; formats: string }> };

export default function Services() {
  const content = usePortalContent("Serviços");
  const hero = content.block<HeroContent>("hero", portalContentDefaults.Serviços.hero as HeroContent);
  const offers = content.block<ServicesContent>("offers", portalContentDefaults.Serviços.offers as unknown as ServicesContent);
  return (
    <div className="public-page">
      <PublicHeader />
      <main>
        {hero && <section className="container grid gap-10 pb-16 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">{hero.eyebrow}</p><h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[.94] sm:text-7xl">{hero.title}</h1><p className="mt-7 max-w-2xl text-base leading-7 text-oju-terra-suave">{hero.description}</p></div>
          <div className="border-l border-oju-dourado/50 pl-6"><p className="font-serif text-3xl leading-snug">A produção contratada é entregue ao contratante. A publicação no acervo é uma escolha posterior, com autorização editorial expressa.</p></div>
        </section>}
        {offers && <section className="border-y border-oju-terra/10 bg-oju-papel"><div className="container py-14 sm:py-20"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">{offers.eyebrow}</p><h2 className="mt-3 font-serif text-4xl">{offers.title}</h2><div className="mt-8 grid gap-px border border-oju-terra/10 md:grid-cols-2">{offers.items.map((service, index) => <article key={`${service.title}-${index}`} className="bg-oju-paz-claro p-7 sm:p-9"><span className="text-[10px] font-bold tracking-[.14em] text-oju-dende">0{index + 1}</span><h3 className="mt-6 font-serif text-3xl">{service.title}</h3><p className="mt-4 text-sm leading-6 text-oju-terra-suave">{service.description}</p><p className="mt-7 flex gap-3 border-t border-oju-terra/10 pt-5 text-xs leading-5 text-oju-dende"><Check className="h-4 w-4 shrink-0" />{service.formats}</p></article>)}</div><Link href="/planejar-um-registro" className="mt-10 inline-flex items-center gap-3 bg-oju-verde px-6 py-4 text-xs font-bold uppercase tracking-[.1em] text-oju-branco">Planejar um registro <ArrowRight className="h-5 w-5" /></Link></div></section>}
        <OjuMethod />
        <section className="container py-16 sm:py-20"><div className="grid gap-8 border border-oju-terra/12 bg-oju-paz-claro p-7 sm:grid-cols-[auto_1fr] sm:p-10"><CircleDot className="h-10 w-10 text-oju-dende" aria-hidden="true" /><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">Por onde começar</p><h2 className="mt-4 font-serif text-4xl">Você não precisa saber o formato antes da conversa.</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-oju-terra-suave">Diga o que está acontecendo, quem está envolvido e o que não pode se perder. A Ojú indica uma forma de registro possível sem confundir contratação com divulgação pública.</p><Link href="/planejar-um-registro" className="mt-7 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-oju-dende">Iniciar planejamento <ArrowRight className="h-4 w-4" /></Link></div></div></section>
      </main>
    </div>
  );
}
