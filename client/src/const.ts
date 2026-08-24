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

  window.location.href = "/api/auth/google/start";
};
