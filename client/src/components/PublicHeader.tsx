import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { portalContentDefaults, usePortalContent } from "@/lib/portalContent";
import { groupPublicNav, ensurePublicPartnerLink } from "@/lib/publicNav";
import { PublicFooter } from "./PublicFooter";

let publicFooterHosts = 0;

function SiteFooterPortal({ cinematic }: { cinematic?: boolean }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    publicFooterHosts += 1;
    if (publicFooterHosts === 1) setActive(true);
    return () => {
      publicFooterHosts -= 1;
    };
  }, []);
  if (!active || typeof document === "undefined") return null;
  return createPortal(<PublicFooter cinematic={cinematic} />, document.body);
}

export function OjuMark({
  compact = false,
  cinematic = false,
  onClick,
}: {
  compact?: boolean;
  cinematic?: boolean;
  onClick?: () => void;
}) {
  const brandUrl = "/oju-assets/oju-midia-marca.png";

  const image = (
    <img
      src={brandUrl}
      alt="Ojú Mídia"
      className={`${compact ? "h-9 w-28" : "h-12 w-40"} object-contain object-center ${cinematic ? "brightness-0 invert" : ""}`}
    />
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="inline-flex items-center" aria-label="Ojú Mídia">
        {image}
      </button>
    );
  }

  return (
    <Link href="/" className="inline-flex items-center" aria-label="Ojú Mídia — início">
      {image}
    </Link>
  );
}

export function PublicHeader({
  cinematic = false,
  onMenuClick,
  includeSiteFooter = true,
}: {
  cinematic?: boolean;
  onMenuClick?: () => void;
  includeSiteFooter?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const color = cinematic ? "text-white" : "text-oju-terra";
  const close = () => { setOpen(false); setActiveGroup(null); };
  const { block } = usePortalContent("Global");
  const navigation = block("navigation", portalContentDefaults.Global.navigation as unknown as { items: Array<{ label: string; href: string; order?: number; active?: boolean; featured?: boolean }> });
  const links = ensurePublicPartnerLink([...(navigation?.items || [])].filter(item => item.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  const { grouped, rest } = groupPublicNav(links);

  return (
    <>
    <header
      className={`${cinematic ? "absolute inset-x-0 top-0 z-40 border-b border-white/15 bg-black/30" : "sticky top-0 z-40 border-b border-oju-terra/10 bg-oju-paz/92"} relative backdrop-blur-md`}
    >
      <div className="container flex h-[78px] items-center justify-between gap-4">
        <OjuMark cinematic={cinematic} />

        <nav className={`hidden items-center gap-1 text-[11px] font-bold uppercase tracking-[.12em] xl:flex ${color}`}>
          {grouped.map(group => (
            <div key={group.id} className="relative" onMouseEnter={() => setActiveGroup(group.id)} onMouseLeave={() => setActiveGroup(null)}>
              <button type="button" className={`px-3 py-7 transition hover:text-oju-dourado ${activeGroup === group.id ? "text-oju-dourado" : ""}`}>{group.label}</button>
              {activeGroup === group.id && (
                <div className={`absolute left-0 top-full min-w-64 border ${cinematic ? "border-white/15 bg-oju-preto-suave text-white" : "border-oju-terra/10 bg-oju-paz text-oju-terra"} p-4 shadow-sm`}>
                  <p className="text-[10px] font-semibold normal-case tracking-normal text-oju-dende">{group.description}</p>
                  <div className="mt-3 grid gap-1">
                    {group.items.map(item => (
                      <Link key={item.href} href={item.href} className="rounded-sm px-2 py-2 text-sm font-semibold normal-case tracking-normal hover:bg-oju-papel hover:text-oju-verde">{item.label}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {rest.map(item => (
            <Link key={item.href} href={item.href} className="px-3 py-7 hover:text-oju-dourado">{item.label}</Link>
          ))}
        </nav>

        <div className={`flex items-center gap-3 ${color}`}>
          <Link href="/busca" className={`rounded-sm p-2 ${cinematic ? "hover:bg-white/10" : "hover:bg-oju-papel"}`} aria-label="Buscar no acervo">
            <Search className="h-5 w-5" />
          </Link>
          <button
            onClick={() => {
              setOpen(value => !value);
              onMenuClick?.();
            }}
            className={`rounded-sm p-2 xl:hidden ${cinematic ? "hover:bg-white/10" : "hover:bg-oju-papel"}`}
            aria-label={open ? "Fechar navegação" : "Abrir navegação"}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className={`border-t ${cinematic ? "border-white/15 bg-oju-preto-filme/98 text-white" : "border-oju-terra/10 bg-oju-paz text-oju-terra"} xl:hidden`}>
          <div className="container grid gap-6 py-6">
            {grouped.map(group => (
              <div key={group.id}>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-oju-dende">{group.label}</p>
                <p className={`mt-1 text-xs font-normal normal-case tracking-normal ${cinematic ? "text-white/55" : "text-oju-terra-suave"}`}>{group.description}</p>
                <div className="mt-3 grid grid-cols-1 gap-1 text-sm font-semibold min-[420px]:grid-cols-2">
                  {group.items.map(item => (
                    <Link key={item.href} href={item.href} onClick={close} className="rounded-sm px-2 py-3 hover:bg-oju-papel hover:text-oju-verde">{item.label}</Link>
                  ))}
                </div>
              </div>
            ))}
            {rest.length ? <div className="grid grid-cols-1 gap-1 text-sm font-semibold min-[420px]:grid-cols-2">{rest.map(item => <Link key={item.href} href={item.href} onClick={close} className="rounded-sm px-2 py-3 hover:text-oju-verde">{item.label}</Link>)}</div> : null}
          </div>
        </nav>
      )}
    </header>
    {includeSiteFooter ? <SiteFooterPortal cinematic={cinematic} /> : null}
    </>
  );
}
