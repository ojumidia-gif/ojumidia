import { Eye, HandHeart, Layers3, MessageCircleHeart, ShieldCheck } from "lucide-react";
import { portalContentDefaults, type MethodContent, usePortalContent } from "@/lib/portalContent";

const icons = [MessageCircleHeart, HandHeart, Eye, Layers3, ShieldCheck] as const;

export function OjuMethod({ compact = false }: { compact?: boolean }) {
  const { block } = usePortalContent("Global");
  const content = block<MethodContent>("method", portalContentDefaults.Global.method as unknown as MethodContent);
  if (!content) return null;
  return (
    <section className="border-y border-white/10 bg-[#0c0907] text-white">
      <div className={`container ${compact ? "py-10" : "py-12 sm:py-14"}`}>
        <div className={`grid gap-7 ${compact ? "lg:grid-cols-[.72fr_1.28fr]" : "lg:grid-cols-[.8fr_1.2fr]"} lg:gap-12`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ef9e59]">{content.eyebrow}</p>
            <h2 className="mt-3 max-w-lg font-serif text-3xl leading-[.98] sm:text-4xl">{content.title}</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/65">{content.description}</p>
          </div>
          <ol className={`grid gap-px border border-white/10 bg-white/10 ${compact ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"}`}>
            {content.items.map((step, index) => {
              const Icon = icons[index];
              return (
                <li key={`${step.order}-${step.title}`} className="bg-[#0c0907] p-4">
                  <div className="flex items-center justify-between gap-4">
                    {Icon ? <Icon className="h-4 w-4 text-[#ef9e59]" aria-hidden="true" /> : <span className="h-4 w-4" />}
                    <span className="text-[10px] font-bold tracking-[.14em] text-white/35">{step.order}</span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl leading-tight">{step.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/60">{step.description}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
