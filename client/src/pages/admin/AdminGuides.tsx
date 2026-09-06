import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { hideFirstGuide, isFirstGuideHidden, showFirstGuideAgain } from "@/lib/adminGuide";
import { siteDestinations } from "@/lib/siteDestinations";
import { AdminPage } from "./_shared";

export default function AdminGuides() {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setHidden(isFirstGuideHidden());
    setReady(true);
  }, []);
  return (
    <AdminPage eyebrow="Primeiro dia" title="Do rascunho ao site, em três passos.">
      <p className="-mt-4 mb-6 max-w-3xl text-sm leading-6 text-[#655e52]">
        {principal
          ? "Cada cartão é um destino público. Crie, complete o mínimo e publique no site. Dúvidas da equipe chegam no Canal Ojú. Ojú Bot não aparece para a Equipe Ojú."
          : "Cada cartão é um destino público. Crie, complete o mínimo e publique no site. Você só vê e altera o que criou. A Home nacional continua com a Equipe Ojú. Dúvida: Ojú Bot. Se não achar resposta pronta, envie ao Canal Ojú."}
      </p>
      {ready ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {hidden ? (
            <Button type="button" variant="outline" onClick={() => { showFirstGuideAgain(); setHidden(false); }}>Mostrar o guia nas telas de novo</Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => { hideFirstGuide(); setHidden(true); }}>Não exibir mais o guia nas telas</Button>
          )}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {siteDestinations.map(dest => (
          <article key={dest.id} className="admin-card p-5">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">{dest.publicHref}</p>
            <h2 className="mt-2 font-serif text-2xl">{dest.label}</h2>
            <p className="mt-2 text-sm leading-6 text-[#655e52]">{dest.how}</p>
            <ol className="mt-4 grid gap-2 text-sm">
              {dest.steps.map((step, index) => (
                <li key={step} className="rounded-xl bg-[#eee9dc] px-3 py-2"><strong>{index + 1}.</strong> {step}</li>
              ))}
            </ol>
            <Link href={dest.adminHref} className="mt-4 inline-flex rounded-full bg-[#242017] px-4 py-2 text-sm font-semibold text-white">Começar {dest.label}</Link>
          </article>
        ))}
      </div>
    </AdminPage>
  );
}
