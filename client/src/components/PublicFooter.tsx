import { Link } from "wouter";
import { portalContentDefaults, usePortalContent } from "@/lib/portalContent";
import { mergeLegalFooterItems } from "@/lib/legalDocuments";

function FooterMark({ onClick }: { onClick?: () => void }) {
  const image = <img src="/oju-assets/oju-midia-marca.png" alt="Ojú Mídia" className="h-9 w-28 object-contain object-center brightness-0 invert" />;
  if (onClick) {
    return <button type="button" onClick={onClick} className="inline-flex items-center" aria-label="Ojú Mídia">{image}</button>;
  }
  return <Link href="/" className="inline-flex items-center" aria-label="Ojú Mídia — início">{image}</Link>;
}

export function PublicFooter({
  cinematic = true,
  onBrandClick,
}: {
  cinematic?: boolean;
  onBrandClick?: () => void;
}) {
  const { block } = usePortalContent("Global");
  const footer = block<{ items: Array<{ label: string; href: string; external?: boolean }>; legalItems: Array<{ label: string; href?: string }> }>(
    "footer",
    portalContentDefaults.Global.footer as unknown as { items: Array<{ label: string; href: string; external?: boolean }>; legalItems: Array<{ label: string; href?: string }> },
  );
  const legalItems = mergeLegalFooterItems(footer?.legalItems || []);
  const tone = cinematic
    ? "border-white/10 bg-black text-[10px] font-bold uppercase tracking-[.08em] text-white/60"
    : "border-[#1f1c16]/10 bg-[#1a1712] text-[10px] font-bold uppercase tracking-[.08em] text-white/60";

  return (
    <footer className={`border-t ${tone}`}>
      <div className="container flex flex-wrap items-center justify-between gap-6 py-8">
        <FooterMark onClick={onBrandClick} />
        {footer ? (
          <>
            <div className="flex flex-wrap gap-5">
              {footer.items.map(item => item.external
                ? <a key={item.href} href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
                : <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </div>
            <div className="flex flex-wrap gap-4">
              {legalItems.map(item => item.href ? <Link key={item.label} href={item.href}>{item.label}</Link> : <span key={item.label}>{item.label}</span>)}
            </div>
          </>
        ) : null}
      </div>
    </footer>
  );
}
