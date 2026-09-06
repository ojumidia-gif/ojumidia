import { Link } from "wouter";
import { portalContentDefaults, usePortalContent } from "@/lib/portalContent";
import { mergeLegalFooterItems } from "@/lib/legalDocuments";
import { ensurePublicPartnerLink } from "@/lib/publicNav";

function FooterMark({ onClick }: { onClick?: () => void }) {
  const image = <img src="/oju-assets/oju-midia-marca.png" alt="Ojú Mídia" className="h-9 w-28 object-contain object-center brightness-0 invert" />;
  if (onClick) {
    return <button type="button" onClick={onClick} className="inline-flex items-center justify-center" aria-label="Ojú Mídia">{image}</button>;
  }
  return <Link href="/" className="inline-flex items-center justify-center" aria-label="Ojú Mídia — início">{image}</Link>;
}

function FooterLinks({
  items,
}: {
  items: Array<{ label: string; href: string; external?: boolean }>;
}) {
  return (
    <nav className="public-footer-nav">
      {items.map(item => item.external
        ? <a key={item.href} href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
        : <Link key={item.href} href={item.href}>{item.label}</Link>)}
    </nav>
  );
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
  const legalItems = mergeLegalFooterItems(footer?.legalItems || []).filter((item): item is { label: string; href: string } => Boolean(item.href));
  const footerItems = ensurePublicPartnerLink(footer?.items || []);
  const tone = cinematic ? "border-white/10 bg-black text-white/65" : "border-[#1f1c16]/10 bg-[#1a1712] text-white/65";

  return (
    <footer className={`public-footer overflow-x-clip border-t ${tone}`}>
      <div className="container flex flex-col items-center gap-5 py-8 text-center lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:text-left">
        <FooterMark onClick={onBrandClick} />
        {footer ? (
          <div className="flex w-full min-w-0 flex-col items-center gap-4 lg:items-end">
            <FooterLinks items={footerItems} />
            <FooterLinks items={legalItems} />
          </div>
        ) : null}
      </div>
    </footer>
  );
}
