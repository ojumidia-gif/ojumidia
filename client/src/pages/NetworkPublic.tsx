import { useMemo, useState } from "react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { professionalSpecialties, type ProfessionalSpecialtyId } from "@shared/professionalSpecialties";

export default function NetworkPublic() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | "profissional" | "casa" | "projeto" | "parceiro">("");
  const [specialtyId, setSpecialtyId] = useState<"" | ProfessionalSpecialtyId>("");
  const list = trpc.networkDirectory.publicList.useQuery({
    q: q || undefined,
    kind: kind || undefined,
    specialtyId: specialtyId || undefined,
    limit: 24,
    offset: 0,
  });
  const items = list.data?.items || [];
  const kinds = useMemo(() => Array.from(new Set(items.map(item => item.kind))), [items]);
  void kinds;

  return (
    <div className="public-page">
      <PageMeta title="Rede Ojú" description="Conheça quem participa da Rede Ojú nos territórios. Não é ranking nem marketplace." url="/rede" />
      <PublicHeader />
      <main className="container pb-20 pt-16">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-oju-verde">Rede territorial</p>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl">Conheça a Rede Ojú.</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-oju-terra-suave">Pessoas, casas, projetos e mídias ligadas ao território. Sem score, sem “melhor profissional” e sem pagar para aparecer.</p>
        <form className="mt-10 grid gap-3 md:grid-cols-3" onSubmit={event => event.preventDefault()}>
          <Input value={q} onChange={event => setQ(event.target.value)} placeholder="Nome, especialidade ou território" />
          <select value={kind} onChange={event => setKind(event.target.value as typeof kind)} className="h-10 rounded border bg-white px-3 text-sm">
            <option value="">Todos os vínculos</option>
            <option value="profissional">Profissionais</option>
            <option value="casa">Casas e instituições</option>
            <option value="projeto">Projetos</option>
            <option value="parceiro">Parceiros Ojú</option>
          </select>
          <select value={specialtyId} onChange={event => setSpecialtyId(event.target.value as "" | ProfessionalSpecialtyId)} className="h-10 rounded border bg-white px-3 text-sm">
            <option value="">Todas as especialidades</option>
            {professionalSpecialties.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </form>
        <section className="mt-10 divide-y divide-oju-terra/10 border-y border-oju-terra/10">
          {list.isLoading ? <p className="py-8 text-sm text-oju-terra-suave">Organizando a Rede…</p> : items.length ? items.map(item => (
            <Link key={`${item.kind}-${item.id}`} href={item.href} className="block py-6 transition hover:bg-oju-papel">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-oju-dende">{item.kind}</p>
              <h2 className="mt-2 font-serif text-3xl">{item.displayName}</h2>
              <p className="mt-2 text-sm text-oju-terra-suave">{item.territoryName || item.specialties?.map(specialty => specialty.label).join(" · ") || item.summary}</p>
            </Link>
          )) : <p className="py-10 text-sm text-oju-terra-suave">Ainda não há presença pública autorizada com esses filtros.</p>}
        </section>
        <p className="mt-8 text-xs text-oju-terra-suave">Contratar uma cobertura continua pelo fluxo institucional da Ojú, não por contratação direta nesta lista.</p>
        <Link href="/contrate-sua-cobertura" className="mt-3 inline-flex text-sm font-semibold text-oju-verde">Contrate uma cobertura</Link>
      </main>
    </div>
  );
}
