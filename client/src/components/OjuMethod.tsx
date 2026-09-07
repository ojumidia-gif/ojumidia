import { Eye, HandHeart, Layers3, MessageCircleHeart, ShieldCheck } from "lucide-react";
import { portalContentDefaults, type MethodContent, usePortalContent } from "@/lib/portalContent";

const icons = [MessageCircleHeart, HandHeart, Eye, Layers3, ShieldCheck] as const;

export function OjuMethod({ compact = false }: { compact?: boolean }) {
  const { block } = usePortalContent("Global");
  const content = block<MethodContent>("method", portalContentDefaults.Global.method as unknown as MethodContent);
  if (!content) return null;
  return (
    <section className="border-y border-oju-terra/10 bg-oju-papel text-oju-terra">
      <div className={`container ${compact ? "py-14" : "py-16 sm:py-20"}`}>
        <div className={`grid gap-8 ${compact ? "lg:grid-cols-[.72fr_1.28fr]" : "lg:grid-cols-[.8fr_1.2fr]"} lg:gap-12`}>
          <div>
            <p className="editorial-kicker">{content.eyebrow}</p>
            <h2 className="mt-3 max-w-lg font-serif text-3xl leading-[.98] sm:text-4xl">{content.title}</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-oju-terra-suave">{content.description}</p>
          </div>
          <ol className={`grid gap-px border border-oju-terra/10 bg-oju-terra/10 ${compact ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"}`}>
            {content.items.map((step, index) => {
              const Icon = icons[index];
              return (
                <li key={`${step.order}-${step.title}`} className="bg-oju-paz-claro p-4">
                  <div className="flex items-center justify-between gap-4">
                    {Icon ? <Icon className="h-4 w-4 text-oju-dourado" aria-hidden="true" /> : <span className="h-4 w-4" />}
                    <span className="text-[10px] font-bold tracking-[.14em] text-oju-terra-suave">{step.order}</span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl leading-tight">{step.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-oju-terra-suave">{step.description}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
