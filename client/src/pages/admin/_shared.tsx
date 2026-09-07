import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { hideFirstGuide, isFirstGuideHidden } from "@/lib/adminGuide";
import { siteDestinationById } from "@/lib/siteDestinations";

export const statusStyle: Record<string, string> = {
  "Rascunho": "bg-oju-papel text-oju-dende",
  "Em revisão": "bg-oju-dourado-claro/40 text-oju-terra",
  "Aprovada": "bg-oju-papel text-oju-verde",
  "Publicada": "bg-oju-verde/15 text-oju-verde-profundo",
  "Arquivada": "bg-oju-papel text-oju-terra-suave",
};
export function AdminPage({ title, eyebrow, action, children }: { title: string; eyebrow: string; action?: React.ReactNode; children: React.ReactNode }) { return <DashboardLayout><div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="editorial-kicker">{eyebrow}</p><h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{title}</h1></div>{action}</div>{children}</div></DashboardLayout>; }
export function EmptyAdmin({ text, href, label }: { text: string; href?: string; label?: string }) { return <div className="admin-card px-6 py-14 text-center"><p className="mx-auto max-w-md text-sm leading-6 text-oju-terra-suave">{text}</p>{href && <Button asChild className="mt-5"><Link href={href}>{label}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>}</div>; }

export function SiteReadiness({ items, readyText }: { items: string[]; readyText?: string }) {
  if (!items.length) {
    return readyText ? <div className="rounded-sm bg-oju-verde/15 px-4 py-3 text-sm text-oju-verde-profundo">{readyText}</div> : null;
  }
  return (
    <div className="rounded-sm border border-oju-dende/30 bg-oju-papel p-4 text-sm text-oju-terra">
      <p className="font-semibold">O que falta para o site</p>
      <ul className="mt-2 list-disc pl-5 text-oju-terra-suave">{items.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

export function FirstUserWelcome() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setHidden(isFirstGuideHidden());
    setReady(true);
  }, []);
  if (!ready || hidden) return null;
  return (
    <section className="mb-6 rounded-sm border border-oju-dourado/25 bg-oju-paz-claro p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="editorial-kicker">Primeiro uso</p>
          <p className="mt-1 font-serif text-2xl">Criar, completar e publicar no site.</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-oju-terra-suave">
            {principal
              ? "Cada destino público tem três passos. A Home nacional fica com a Equipe Ojú. Dúvidas da equipe chegam no Canal Ojú. Ojú Bot é só para criador parceiro."
              : "Três passos até o site: texto, território e capa. Depois Publicar. Você só vê e altera o que criou. A Home nacional continua com a Equipe Ojú. Dúvida: Ojú Bot."}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => { hideFirstGuide(); setHidden(true); }}>Não exibir mais</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/guia" className="rounded-sm bg-oju-verde px-4 py-2 text-sm font-semibold text-oju-branco">Abrir o guia</Link>
        <Link href="/admin/publicacoes?novo=1" className="rounded-sm border border-oju-terra/20 px-4 py-2 text-sm font-semibold">Começar uma história</Link>
      </div>
    </section>
  );
}

export function ThreeStepsGuide({ steps }: { steps: [string, string, string] }) {
  return (
    <ol className="mb-6 grid gap-2 sm:grid-cols-3 text-sm">
      {steps.map((step, index) => (
        <li key={step} className="rounded-sm bg-oju-papel px-4 py-3">
          <strong>{index + 1}.</strong> {step}
        </li>
      ))}
    </ol>
  );
}

export function AdminFlowGuide({ destinationId }: { destinationId: string }) {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const dest = siteDestinationById(destinationId);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setHidden(isFirstGuideHidden());
    setReady(true);
  }, [destinationId]);
  if (!dest || !ready || hidden) return null;
  return (
    <section className="mb-6 rounded-sm border border-oju-dourado/25 bg-oju-paz-claro p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="editorial-kicker">Primeiro uso</p>
          <p className="mt-1 font-serif text-2xl">{dest.label}: criar até publicar</p>
          <p className="mt-1 text-sm text-oju-terra-suave">{dest.how}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => { hideFirstGuide(); setHidden(true); }}>Não exibir mais</Button>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-3 text-sm">
        {dest.steps.map((step, index) => (
          <li key={step} className="rounded-xl bg-white/80 px-4 py-3"><strong>{index + 1}.</strong> {step}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-oju-terra-suave">{principal ? "A equipe manda dúvida e sugestão no Canal Ojú. Ojú Bot não aparece para a Equipe Ojú." : "Dúvida depois: Ojú Bot, canto da tela. Se não achar resposta, envia ao Canal Ojú."}</p>
    </section>
  );
}
