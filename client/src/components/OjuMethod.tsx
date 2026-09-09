import { Eye, HandHeart, Layers3, MessageCircleHeart, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { ojuMethod, ojuMethodCare } from "@/lib/publicArchitecture";
import { portalContentDefaults, type MethodContent, usePortalContent } from "@/lib/portalContent";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const icons = [MessageCircleHeart, HandHeart, Eye, Layers3, ShieldCheck] as const;

export function OjuMethod({ compact = false }: { compact?: boolean }) {
  const { block } = usePortalContent("Global");
  const content = block<MethodContent>("method", portalContentDefaults.Global.method as unknown as MethodContent);
  if (!content) return null;
  const items = content.items?.length ? content.items : [...ojuMethod];
  return (
    <section className="border-y border-oju-terra/10 bg-oju-papel text-oju-terra">
      <div className={`container ${compact ? "py-14" : "py-16 sm:py-20"}`}>
        <div className={`grid gap-8 ${compact ? "lg:grid-cols-[.72fr_1.28fr]" : "lg:grid-cols-[.8fr_1.2fr]"} lg:gap-12`}>
          <div>
            <p className="editorial-kicker">{content.eyebrow}</p>
            <h2 className="mt-3 max-w-lg font-serif text-3xl leading-[.98] sm:text-4xl">{content.title}</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-oju-terra-suave">{content.description}</p>
            <p className="mt-4 max-w-lg text-sm leading-6 text-oju-terra-suave">Registrar é uma relação de cuidado: pessoa, território, imagem, profissional, autoria e uso autorizado.</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" className="text-xs font-bold uppercase tracking-[.1em] text-oju-verde underline-offset-4 hover:underline">
                    Ler o Método Ojú
                  </button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto border-oju-terra/15 bg-oju-paz-claro sm:max-w-xl" aria-describedby="oju-method-desc">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-3xl leading-tight text-oju-terra">Método Ojú</DialogTitle>
                    <DialogDescription id="oju-method-desc" className="text-sm leading-6 text-oju-terra-suave">
                      Cuidado antes da câmera. Registrar começa quando a Ojú compreende o que está sendo vivido.
                    </DialogDescription>
                  </DialogHeader>
                  <p className="text-sm leading-6 text-oju-terra-suave">O valor não está só na fotografia final, e sim na relação entre pessoa, olhar, território, contexto, autoria e memória. Apagar crédito, marca ou identificação pode apagar parte dessa memória.</p>
                  <ol className="grid gap-3">
                    {ojuMethodCare.map((item, index) => (
                      <li key={item} className="border-t border-oju-terra/10 pt-3 text-sm leading-6 text-oju-terra">
                        <span className="mr-2 text-[10px] font-bold tracking-[.14em] text-oju-terra-suave">{String(index + 1).padStart(2, "0")}</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                  <Link href="/vozes-da-rede" className="text-xs font-bold uppercase tracking-[.1em] text-oju-verde">
                    Vozes da Rede Ojú
                  </Link>
                </DialogContent>
              </Dialog>
              <Link href="/vozes-da-rede" className="text-xs font-bold uppercase tracking-[.1em] text-oju-terra-suave hover:text-oju-verde">
                Depoimentos
              </Link>
            </div>
          </div>
          <ol className={`grid gap-px border border-oju-terra/10 bg-oju-terra/10 ${compact ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"}`}>
            {items.map((step, index) => {
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
