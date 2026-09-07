import { instagramHandleLabel, instagramProfileUrl } from "@shared/instagramHandle";

export function AuthorizedInstagram({ handle, className = "text-xs font-bold uppercase tracking-[.1em] text-oju-dende" }: { handle?: string | null; className?: string }) {
  if (!handle) return null;
  return (
    <a href={instagramProfileUrl(handle)} target="_blank" rel="noreferrer" className={className}>
      {instagramHandleLabel(handle)}
    </a>
  );
}
