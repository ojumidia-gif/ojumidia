import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { LEGAL_UPDATED_AT, legalDocuments, type LegalKind } from "@/lib/legalDocuments";
import { Link } from "wouter";

export default function LegalDocument({ kind }: { kind: LegalKind }) {
  const doc = legalDocuments[kind];
  const other = kind === "terms" ? legalDocuments.privacy : legalDocuments.terms;
  return (
    <div className="min-h-screen bg-[#070605] text-white">
      <PageMeta title={`${doc.title.replace(/\.$/, "")} — Ojú Mídia`} description={doc.description} />
      <PublicHeader cinematic />
      <main className="container pb-20 pt-32">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ef9e59]">{doc.eyebrow}</p>
        <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[.95] sm:text-6xl">{doc.title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white/65">{doc.description}</p>
        <p className="mt-4 text-xs uppercase tracking-[.12em] text-white/45">Atualizado em {LEGAL_UPDATED_AT}</p>
        <div className="mt-12 grid gap-10 border-t border-white/10 pt-10 lg:grid-cols-[1fr_220px]">
          <div className="max-w-3xl space-y-10">
            {doc.sections.map(section => (
              <section key={section.title}>
                <h2 className="font-serif text-3xl">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                  {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
          <aside className="h-fit rounded border border-white/15 bg-[#100d0a] p-5 text-sm leading-6 text-white/65">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ef9e59]">Também no site</p>
            <Link href={other.href} className="mt-3 block font-semibold text-[#ef9e59]">{other.eyebrow}</Link>
            <Link href="/cuidado-e-consentimento" className="mt-2 block font-semibold text-[#ef9e59]">Cuidado e consentimento</Link>
            <Link href="/contato" className="mt-2 block font-semibold text-[#ef9e59]">Contato</Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
