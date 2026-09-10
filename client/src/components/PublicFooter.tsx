import { Link } from "wouter";
import { portalContentDefaults, usePortalContent } from "@/lib/portalContent";
import { mergeLegalFooterItems } from "@/lib/legalDocuments";
import { ensurePublicPartnerLink } from "@/lib/publicNav";

function FooterMark({ onClick, cinematic }: { onClick?: () => void; cinematic?: boolean }) {
  const image = <img src="/oju-assets/oju-midia-marca.png" alt="Ojú Mídia" className={`h-9 w-28 object-contain object-center ${cinematic ? "brightness-0 invert" : ""}`} />;
  if (onClick) {
    return <button type="button" onClick={onClick} className="inline-flex items-center justify-center" aria-label="Ojú Mídia">{image}</button>;
  }
  return <Link href="/" className="inline-flex items-center justify-center" aria-label="Ojú Mídia — início">{image}</Link>;
}

function FooterLinks({
  items,
  tone = "main",
}: {
  items: Array<{ label: string; href: string; external?: boolean }>;
  tone?: "main" | "legal";
}) {
  return (
    <nav className={`public-footer-nav ${tone === "legal" ? "public-footer-nav--legal" : ""}`}>
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
  const tone = cinematic
    ? "public-footer--cinema border-white/10 bg-oju-preto-filme text-white/70"
    : "border-oju-terra/10 bg-oju-paz text-oju-terra-suave";

  return (
    <footer className={`public-footer overflow-x-clip border-t ${tone}`}>
      <div className="container flex flex-col items-center gap-6 py-10 text-center">
        <FooterMark cinematic={cinematic} onClick={onBrandClick} />
        {footer ? (
          <>
            <FooterLinks items={footerItems} />
            <div className={`h-px w-12 ${cinematic ? "bg-white/20" : "bg-oju-dourado/50"}`} aria-hidden="true" />
            <div className="flex flex-col items-center gap-3">
              <FooterLinks items={legalItems} tone="legal" />
              <p className="public-footer-copyright">© 2026 Ojú Mídia · Todos os direitos reservados</p>
            </div>
          </>
        ) : null}
      </div>
    </footer>
  );
}
