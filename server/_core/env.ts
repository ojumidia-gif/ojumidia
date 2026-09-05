const DEFAULT_SUPER_ADMIN_EMAILS = ["ojumidia@gmail.com", "aquinopratesr@gmail.com"];

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map(entry => entry.trim())
    .filter(Boolean);
}

function parseEmailAllowlist(value: string | undefined): Set<string> {
  const configured = parseCsv(value).map(email => email.toLowerCase());
  return new Set(configured.length > 0 ? configured : DEFAULT_SUPER_ADMIN_EMAILS);
}

function parseGoogleSubs(value: string | undefined): Set<string> {
  return new Set(
    parseCsv(value).map(entry => (entry.startsWith("google:") ? entry : `google:${entry}`))
  );
}

export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
  googleSuperAdminEmails: parseEmailAllowlist(process.env.GOOGLE_SUPER_ADMIN_EMAILS),
  googleSuperAdminSubs: parseGoogleSubs(process.env.GOOGLE_SUPER_ADMIN_SUBS),
};

export function isGoogleOAuthConfigured() {
  return Boolean(
    (process.env.GOOGLE_CLIENT_ID ?? "").trim() &&
      (process.env.GOOGLE_CLIENT_SECRET ?? "").trim() &&
      (process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "").trim() &&
      (process.env.JWT_SECRET ?? "").trim()
  );
}

export function isAuthorizedSuperAdmin(openId: string | undefined, email: string | null | undefined) {
  const normalizedOpenId = openId?.trim() ?? "";
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  if (normalizedOpenId && ENV.googleSuperAdminSubs.has(normalizedOpenId)) return true;
  if (normalizedEmail && ENV.googleSuperAdminEmails.has(normalizedEmail)) return true;
  return false;
}
