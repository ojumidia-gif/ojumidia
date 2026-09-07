import { ArrowRight } from "lucide-react";
import { PlanningRegistrationForm } from "@/components/PlanningRegistrationForm";
import { PublicHeader } from "@/components/PublicHeader";

export default function PlanRegistration() {
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="container grid gap-12 pb-20 pt-16 lg:grid-cols-[.8fr_1.2fr]">
        <section><p className="text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">Chamar a Ojú</p><h1 className="mt-5 font-serif text-5xl leading-[.94] sm:text-6xl">Antes de escolher uma câmera, entendemos o que precisa permanecer.</h1><p className="mt-7 max-w-lg text-base leading-7 text-oju-terra-suave">Esta conversa serve para casas, comunidades, projetos, celebrações e pessoas que desejam registrar algo significativo com cuidado de contexto, crédito e autorização.</p><div className="mt-10 space-y-4 border-t border-oju-terra/12 pt-7 text-sm leading-6 text-oju-terra-suave"><p><strong className="text-oju-terra">Escuta → planejamento → produção → entrega.</strong></p><p>O material contratado fica privado por padrão. A publicação na Ojú só acontece quando há autorização editorial expressa.</p></div><a href="https://wa.me/5592920019527" target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-oju-dende">Falar no WhatsApp <ArrowRight className="h-4 w-4" /></a></section>
        <PlanningRegistrationForm />
      </main>
    </div>
  );
}
