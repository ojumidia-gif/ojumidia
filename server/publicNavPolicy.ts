export const ALLOWED_PUBLIC_HREFS = [
  "/",
  "/historias",
  "/memorias-documentais",
  "/servicos",
  "/comunidade",
  "/sobre",
  "/coberturas",
  "/documentarios",
  "/projetos",
  "/territorios",
  "/fotografos",
  "/acervo",
  "/fotografia-documental",
  "/planejar-um-registro",
  "/contato",
  "/ser-parceiro",
  "/apoie-uma-memoria",
  "/licenciar-midia",
  "/instituicoes",
  "/agenda",
  "/memorias",
  "/cuidado-e-consentimento",
  "/acompanhar-acolhimento",
  "/conheca-a-oju",
  "/contrate-sua-cobertura",
  "/busca",
  "/termos-de-uso",
  "/privacidade",
] as const;

export type PublicNavItem = {
  label: string;
  href: string;
  order: number;
  active: boolean;
  featured: boolean;
};

function isAllowedHref(href: string) {
  return (ALLOWED_PUBLIC_HREFS as readonly string[]).includes(href);
}

export function sanitizePublicNavigation(contentJson: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    throw new Error("A navegação pública precisa ser um JSON válido.");
  }
  const items = parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray((parsed as { items?: unknown }).items)
    ? (parsed as { items: unknown[] }).items
    : null;
  if (!items) throw new Error("A navegação pública precisa de uma lista items.");
  const sanitized: PublicNavItem[] = items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Cada item de navegação precisa ser um objeto.");
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const href = typeof record.href === "string" ? record.href.trim() : "";
    if (label.length < 2 || label.length > 80) throw new Error("Informe um nome de menu entre 2 e 80 caracteres.");
    if (!isAllowedHref(href)) throw new Error(`O destino ${href || "(vazio)"} não é uma rota pública existente. O CMS não cria rotas novas.`);
    return {
      label,
      href,
      order: typeof record.order === "number" && Number.isFinite(record.order) ? record.order : index,
      active: record.active !== false,
      featured: record.featured === true,
    };
  });
  return JSON.stringify({ items: sanitized });
}

export function visiblePublicNavItems(items: Array<{ label: string; href: string; order?: number; active?: boolean; featured?: boolean }>) {
  return [...items]
    .filter(item => item.active !== false && isAllowedHref(item.href))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
