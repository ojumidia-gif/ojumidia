import { describe, expect, it } from "vitest";
import { getAuthRuntimeStatus } from "./_core/authStatus";

describe("status de autenticação sem erro operacional falso", () => {
  it("não trata OAuth Google ausente como falha quando o login local de desenvolvimento está habilitado", () => {
    const previous = {
      NODE_ENV: process.env.NODE_ENV,
      OJU_LOCAL_DEV_LOGIN_ENABLED: process.env.OJU_LOCAL_DEV_LOGIN_ENABLED,
      OJU_LOCAL_ADMIN_EMAIL: process.env.OJU_LOCAL_ADMIN_EMAIL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
      JWT_SECRET: process.env.JWT_SECRET,
    };
    process.env.NODE_ENV = "development";
    process.env.OJU_LOCAL_DEV_LOGIN_ENABLED = "true";
    process.env.OJU_LOCAL_ADMIN_EMAIL = "aquinopratesr@gmail.com";
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    process.env.JWT_SECRET = "local-test-secret";
    try {
      const status = getAuthRuntimeStatus();
      expect(status.googleOAuth).toBe(false);
      expect(status.loginMode).toBe("local-development");
      expect(status.message).toContain("OAuth Google não está configurado");
      expect(status.message).not.toContain("OAUTH_SERVER_URL");
    } finally {
      process.env.NODE_ENV = previous.NODE_ENV;
      process.env.OJU_LOCAL_DEV_LOGIN_ENABLED = previous.OJU_LOCAL_DEV_LOGIN_ENABLED;
      process.env.OJU_LOCAL_ADMIN_EMAIL = previous.OJU_LOCAL_ADMIN_EMAIL;
      process.env.GOOGLE_CLIENT_ID = previous.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_SECRET = previous.GOOGLE_CLIENT_SECRET;
      process.env.GOOGLE_OAUTH_REDIRECT_URI = previous.GOOGLE_OAUTH_REDIRECT_URI;
      process.env.JWT_SECRET = previous.JWT_SECRET;
    }
  });
});
