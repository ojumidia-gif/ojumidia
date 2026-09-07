import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { LEGAL_UPDATED_AT, legalDocuments, type LegalKind } from "@/lib/legalDocuments";
import { Link } from "wouter";

export default function LegalDocument({ kind }: { kind: LegalKind }) {
  const doc = legalDocuments[kind];
  const other = kind === "terms" ? legalDocuments.privacy : legalDocuments.terms;
  return (
    <div className="public-page">
      <PageMeta title={`${doc.title.replace(/\.$/, "")} — Ojú Mídia`} description={doc.description} />
      <PublicHeader />
      <main className="container pb-20 pt-16">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">{doc.eyebrow}</p>
        <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[.95] sm:text-6xl">{doc.title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-oju-terra-suave">{doc.description}</p>
        <p className="mt-4 text-xs uppercase tracking-[.12em] text-oju-terra-suave">Atualizado em {LEGAL_UPDATED_AT}</p>
        <div className="mt-12 grid gap-10 border-t border-oju-terra/10 pt-10 lg:grid-cols-[1fr_220px]">
          <div className="max-w-3xl space-y-10">
            {doc.sections.map(section => (
              <section key={section.title}>
                <h2 className="font-serif text-3xl">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-oju-terra-suave">
                  {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
          <aside className="h-fit rounded border border-oju-terra/12 bg-oju-paz-claro p-5 text-sm leading-6 text-oju-terra-suave">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-oju-dende">Também no site</p>
            <Link href={other.href} className="mt-3 block font-semibold text-oju-dende">{other.eyebrow}</Link>
            <Link href="/cuidado-e-consentimento" className="mt-2 block font-semibold text-oju-dende">Cuidado e consentimento</Link>
            <Link href="/contato" className="mt-2 block font-semibold text-oju-dende">Contato</Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
