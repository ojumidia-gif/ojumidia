import type { CompleteProductionLink } from "@shared/externalPublicationLink";

/** Só renderiza `url` + `label` já resolvidos pelo serializer. Fallback e sanitização ficam em shared/externalPublicationLink. */
export function CompleteProductionLinks({
  links,
  variant = "public",
}: {
  links?: CompleteProductionLink[] | null;
  variant?: "public" | "preview";
}) {
  if (!links?.length) return null;
  const heading = variant === "preview" ? "text-[10px] font-bold uppercase tracking-[.14em] text-white/45" : "text-[10px] font-bold uppercase tracking-[.14em] text-oju-terra-suave";
  const anchor = variant === "preview" ? "text-sm font-semibold text-[#ed9c58]" : "inline-flex text-sm font-semibold text-oju-verde";
  return (
    <section className={variant === "preview" ? "mt-12 border-t border-white/10 pt-8" : "mt-14 border-t border-oju-terra/15 pt-8"} aria-label="Produção completa">
      <p className={heading}>Produção completa</p>
      <ul className="mt-4 space-y-3">
        {links.map(link => (
          <li key={`${link.label}:${link.url}`}>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className={anchor}>
              {link.label} →
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
