import { isGoogleOAuthConfigured } from "./env";
import { localDevAuthEnabled } from "./localDevAuth";

export type AuthRuntimeStatus = {
  googleOAuth: boolean;
  localDevLogin: boolean;
  sessionSecret: boolean;
  loginMode: "google" | "local-development" | "unavailable";
  message: string;
};

export function getAuthRuntimeStatus(): AuthRuntimeStatus {
  const googleOAuth = isGoogleOAuthConfigured();
  const localDevLogin = localDevAuthEnabled();
  const sessionSecret = Boolean(process.env.JWT_SECRET?.trim());
  const loginMode = googleOAuth ? "google" : localDevLogin ? "local-development" : "unavailable";
  const message =
    loginMode === "google"
      ? "Login Google configurado."
      : loginMode === "local-development"
        ? "OAuth Google não está configurado neste ambiente. Use o acesso local de desenvolvimento."
        : process.env.NODE_ENV === "production"
          ? "OAuth Google não está configurado. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI e JWT_SECRET."
          : "Nenhum login administrativo está disponível. Configure o OAuth Google ou habilite OJU_LOCAL_DEV_LOGIN_ENABLED com OJU_LOCAL_ADMIN_EMAIL e JWT_SECRET.";
  return { googleOAuth, localDevLogin, sessionSecret, loginMode, message };
}
