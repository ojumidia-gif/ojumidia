import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { hideFirstGuide, isFirstGuideHidden } from "@/lib/adminGuide";
import { siteDestinationById } from "@/lib/siteDestinations";

export const statusStyle: Record<string, string> = { "Rascunho": "bg-[#eee4c8] text-[#695411]", "Em revisão": "bg-[#dce7ef] text-[#28516b]", "Aprovada": "bg-[#e1e8d0] text-[#456027]", "Publicada": "bg-[#d8eadc] text-[#2c683b]", "Arquivada": "bg-[#e8e7e2] text-[#5f5d56]" };
export function AdminPage({ title, eyebrow, action, children }: { title: string; eyebrow: string; action?: React.ReactNode; children: React.ReactNode }) { return <DashboardLayout><div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="editorial-kicker">{eyebrow}</p><h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{title}</h1></div>{action}</div>{children}</div></DashboardLayout>; }
export function EmptyAdmin({ text, href, label }: { text: string; href?: string; label?: string }) { return <div className="admin-card px-6 py-14 text-center"><p className="mx-auto max-w-md text-sm leading-6 text-[#655e52]">{text}</p>{href && <Button asChild className="mt-5 bg-[#242017] text-white"><Link href={href}>{label}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>}</div>; }

export function SiteReadiness({ items, readyText }: { items: string[]; readyText?: string }) {
  if (!items.length) {
    return readyText ? <div className="rounded-2xl bg-[#e8f0e4] px-4 py-3 text-sm text-[#2c683b]">{readyText}</div> : null;
  }
  return (
    <div className="rounded-2xl border border-[#8b4d24]/30 bg-[#fff4ec] p-4 text-sm text-[#6b3a22]">
      <p className="font-semibold">O que falta para o site</p>
      <ul className="mt-2 list-disc pl-5 text-[#655e52]">{items.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

export function FirstUserWelcome() {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setHidden(isFirstGuideHidden());
    setReady(true);
  }, []);
  if (!ready || hidden) return null;
  return (
    <section className="mb-6 rounded-2xl border border-[#806817]/25 bg-[#fff8ea] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Primeiro uso</p>
          <p className="mt-1 font-serif text-2xl">Criar, completar e publicar no site.</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655e52]">
            Cada destino público tem três passos. A Home nacional continua só com o Super Admin. Dúvida: Ojú Bot, canto da tela. Se a resposta pronta não existir, envie ao Canal Ojú.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => { hideFirstGuide(); setHidden(true); }}>Não exibir mais</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/guia" className="rounded-full bg-[#242017] px-4 py-2 text-sm font-semibold text-white">Abrir o guia</Link>
        <Link href="/admin/publicacoes?novo=1" className="rounded-full border border-[#242017]/20 px-4 py-2 text-sm font-semibold">Começar uma história</Link>
      </div>
    </section>
  );
}

export function ThreeStepsGuide({ steps }: { steps: [string, string, string] }) {
  return (
    <ol className="mb-6 grid gap-2 sm:grid-cols-3 text-sm">
      {steps.map((step, index) => (
        <li key={step} className="rounded-xl bg-[#eee9dc] px-4 py-3">
          <strong>{index + 1}.</strong> {step}
        </li>
      ))}
    </ol>
  );
}

export function AdminFlowGuide({ destinationId }: { destinationId: string }) {
  const dest = siteDestinationById(destinationId);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setHidden(isFirstGuideHidden());
    setReady(true);
  }, [destinationId]);
  if (!dest || !ready || hidden) return null;
  return (
    <section className="mb-6 rounded-2xl border border-[#806817]/25 bg-[#fff8ea] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Primeiro uso</p>
          <p className="mt-1 font-serif text-2xl">{dest.label}: criar até publicar</p>
          <p className="mt-1 text-sm text-[#655e52]">{dest.how}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => { hideFirstGuide(); setHidden(true); }}>Não exibir mais</Button>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-3 text-sm">
        {dest.steps.map((step, index) => (
          <li key={step} className="rounded-xl bg-white/80 px-4 py-3"><strong>{index + 1}.</strong> {step}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-[#655e52]">Dúvida depois: Ojú Bot, canto da tela. Se não achar resposta, envia ao Canal Ojú.</p>
    </section>
  );
}
