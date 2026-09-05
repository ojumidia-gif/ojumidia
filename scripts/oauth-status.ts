import "dotenv/config";
import { isGoogleOAuthConfigured } from "../server/_core/env";
import { getAuthRuntimeStatus } from "../server/_core/authStatus";

function hostOf(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

const status = getAuthRuntimeStatus();
console.log(JSON.stringify({
  googleConfigured: isGoogleOAuthConfigured(),
  loginMode: status.loginMode,
  localDev: status.localDevLogin,
  redirectHost: hostOf(process.env.GOOGLE_OAUTH_REDIRECT_URI || ""),
  redirectIsLocal: /localhost|127\.0\.0\.1/.test(process.env.GOOGLE_OAUTH_REDIRECT_URI || ""),
}, null, 2));
