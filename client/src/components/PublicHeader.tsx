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
  const color = cinematic ? "text-white" : "text-[#3d382e]";
  const close = () => { setOpen(false); setActiveGroup(null); };
  const { block } = usePortalContent("Global");
  const navigation = block("navigation", portalContentDefaults.Global.navigation as unknown as { items: Array<{ label: string; href: string; order?: number; active?: boolean; featured?: boolean }> });
  const links = ensurePublicPartnerLink([...(navigation?.items || [])].filter(item => item.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  const { grouped, rest } = groupPublicNav(links);

  return (
    <>
    <header
      className={`${cinematic ? "absolute inset-x-0 top-0 z-40 border-b border-white/15 bg-black/30" : "sticky top-0 z-40 border-b border-[#1f1c16]/10 bg-[#f4efe6]/92"} relative backdrop-blur-md`}
    >
      <div className="container flex h-[78px] items-center justify-between gap-4">
        <OjuMark cinematic={cinematic} />

        <nav className={`hidden items-center gap-1 text-[11px] font-bold uppercase tracking-[.12em] xl:flex ${color}`}>
          {grouped.map(group => (
            <div key={group.id} className="relative" onMouseEnter={() => setActiveGroup(group.id)} onMouseLeave={() => setActiveGroup(null)}>
              <button type="button" className={`px-3 py-7 transition hover:text-[#c45c26] ${activeGroup === group.id ? "text-[#c45c26]" : ""}`}>{group.label}</button>
              {activeGroup === group.id && (
                <div className={`absolute left-0 top-full min-w-64 border ${cinematic ? "border-white/15 bg-[#120e0b] text-white" : "border-[#1f1c16]/10 bg-[#f4efe6] text-[#3d382e]"} p-4 shadow-xl`}>
                  <p className="text-[10px] font-semibold normal-case tracking-normal text-[#c45c26]">{group.description}</p>
                  <div className="mt-3 grid gap-1">
                    {group.items.map(item => (
                      <Link key={item.href} href={item.href} className="rounded px-2 py-2 text-sm font-semibold normal-case tracking-normal hover:bg-white/10 hover:text-[#ed9c58]">{item.label}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {rest.map(item => (
            <Link key={item.href} href={item.href} className="px-3 py-7 hover:text-[#c45c26]">{item.label}</Link>
          ))}
        </nav>

        <div className={`flex items-center gap-3 ${color}`}>
          <Link href="/busca" className="rounded-full p-2 hover:bg-white/10" aria-label="Buscar no acervo">
            <Search className="h-5 w-5" />
          </Link>
          <button
            onClick={() => {
              setOpen(value => !value);
              onMenuClick?.();
            }}
            className="rounded-full p-2 hover:bg-white/10 xl:hidden"
            aria-label={open ? "Fechar navegação" : "Abrir navegação"}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className={`border-t ${cinematic ? "border-white/15 bg-[#090807]/98 text-white" : "border-[#1f1c16]/10 bg-[#f4efe6] text-[#3d382e]"} xl:hidden`}>
          <div className="container grid gap-6 py-6">
            {grouped.map(group => (
              <div key={group.id}>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#c45c26]">{group.label}</p>
                <p className={`mt-1 text-xs font-normal normal-case tracking-normal ${cinematic ? "text-white/55" : "text-[#655e52]"}`}>{group.description}</p>
                <div className="mt-3 grid grid-cols-1 gap-1 text-sm font-semibold min-[420px]:grid-cols-2">
                  {group.items.map(item => (
                    <Link key={item.href} href={item.href} onClick={close} className="rounded px-2 py-3 hover:bg-white/10 hover:text-[#ed9c58]">{item.label}</Link>
                  ))}
                </div>
              </div>
            ))}
            {rest.length ? <div className="grid grid-cols-2 gap-1 text-xs font-bold uppercase tracking-[.08em]">{rest.map(item => <Link key={item.href} href={item.href} onClick={close} className="rounded px-2 py-3 hover:text-[#ed9c58]">{item.label}</Link>)}</div> : null}
          </div>
        </nav>
      )}
    </header>
    {includeSiteFooter ? <SiteFooterPortal cinematic={cinematic} /> : null}
    </>
  );
}
