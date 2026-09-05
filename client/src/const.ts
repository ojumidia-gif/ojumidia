import { hasOAuthConfiguration } from "@/lib/runtimeMode";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start Google OAuth via the server. Call this from an event handler or effect
// at the moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has SIDE EFFECTS — it navigates immediately to the server route that mints
// state/nonce and redirects to Google. Do NOT call it during render
// (no `href={startLogin()}`). It returns void by design.
export const startLogin = () => {
  if (!hasOAuthConfiguration()) {
    console.info("[Auth] OAuth indisponível: este ambiente não possui configuração de servidor autenticado.");
    return;
  }

  void (async () => {
    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      const status = response.ok
        ? (await response.json()) as { loginMode?: string; message?: string }
        : null;
      if (status?.loginMode === "local-development") {
        window.location.href = "/admin/acesso-local";
        return;
      }
      if (status?.loginMode === "google") {
        window.location.href = "/api/auth/google/start";
        return;
      }
      console.info("[Auth]", status?.message || "Login administrativo indisponível neste ambiente.");
    } catch {
      console.info("[Auth] Não foi possível consultar o status de autenticação.");
    }
  })();
};
