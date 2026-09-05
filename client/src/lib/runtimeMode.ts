export const isStaticFirebasePreview = import.meta.env.VITE_OJU_STATIC_PREVIEW === "true";

/**
 * Ativos copiados para dist/public/oju-assets exclusivamente pelo comando
 * build:firebase-preview. Em execução completa, as mídias permanecem na fonte
 * de armazenamento autorizada e não são duplicadas no bundle da aplicação.
 */
export const firebasePreviewAssets = {
  brandUrl: "/oju-assets/oju-midia-marca.png",
  heroVideoUrl: "/oju-assets/orixas-transicao-ritual-cinematografica.mp4",
} as const;

export function hasOAuthConfiguration() {
  return !isStaticFirebasePreview;
}

export function hasAnalyticsConfiguration(endpoint?: string, websiteId?: string) {
  return Boolean(
    endpoint &&
      websiteId &&
      !endpoint.includes("%") &&
      !websiteId.includes("%")
  );
}

export function initializeAnalytics() {
  if (isStaticFirebasePreview) return;
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
  if (!hasAnalyticsConfiguration(endpoint, websiteId)) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${endpoint.replace(/\/$/, "")}/umami`;
  script.dataset.websiteId = websiteId;
  document.head.appendChild(script);
}
