import { Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { portalContentDefaults, usePortalContent } from "@/lib/portalContent";

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
      alt="OjÃº MÃ­dia"
      className={`${compact ? "h-9 w-28" : "h-12 w-40"} object-contain object-center ${cinematic ? "brightness-0 invert" : ""}`}
    />
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="inline-flex items-center" aria-label="OjÃº MÃ­dia">
        {image}
      </button>
    );
  }

  return (
    <Link href="/" className="inline-flex items-center" aria-label="OjÃº MÃ­dia â€” inÃ­cio">
      {image}
    </Link>
  );
}

export function PublicHeader({
  cinematic = false,
  onMenuClick,
}: {
  cinematic?: boolean;
  onMenuClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const color = cinematic ? "text-white" : "text-[#3d382e]";
  const close = () => setOpen(false);
  const { block } = usePortalContent("Global");
  const navigation = block("navigation", portalContentDefaults.Global.navigation);
  const links = navigation?.items || [];

  return (
    <header
      className={`${cinematic ? "absolute inset-x-0 top-0 z-40 border-b border-white/15 bg-black/30" : "sticky top-0 z-40 border-b border-[#1f1c16]/10 bg-[#f7f5ef]/92"} relative backdrop-blur-md`}
    >
      <div className="container flex h-[74px] items-center justify-between gap-4">
        <OjuMark cinematic={cinematic} />

        <nav className={`hidden items-center gap-3 text-[9px] font-bold uppercase tracking-[.055em] xl:flex ${color}`}>
          {links.map(({ label, href }, index) => (
            <Link
              key={`${label}-${href}`}
              href={href}
              className={`relative whitespace-nowrap py-7 transition hover:text-[#f0a45f] ${cinematic && index === 0 ? "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-[#ef9e59]" : ""}`}
            >
              {label}
            </Link>
          ))}
          <Link href="/planejar-um-registro" className="whitespace-nowrap text-[#f0a45f]">
            Planejar um registro
          </Link>
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
            aria-label={open ? "Fechar navegaÃ§Ã£o" : "Abrir navegaÃ§Ã£o"}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className={`border-t ${cinematic ? "border-white/15 bg-[#090807]/98 text-white" : "border-[#1f1c16]/10 bg-[#f7f5ef] text-[#3d382e]"} xl:hidden`}>
          <div className="container grid grid-cols-2 gap-x-5 gap-y-1 py-5 text-xs font-bold uppercase tracking-[.08em]">
            {links.map(({ label, href }) => (
              <Link
                key={`${label}-${href}`}
                href={href}
                onClick={close}
                className="rounded px-2 py-3 hover:bg-white/10 hover:text-[#ef9e59]"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/planejar-um-registro"
              onClick={close}
              className="col-span-2 rounded px-2 py-3 text-[#ef9e59]"
            >
              Planejar um registro
            </Link>
            <Link
              href="/cuidado-e-consentimento"
              onClick={close}
              className="col-span-2 rounded px-2 py-3 text-[#ef9e59]"
            >
              Cuidado e consentimento
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

