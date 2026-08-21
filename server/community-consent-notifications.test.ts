import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("interfaces de consentimento e acolhimento", () => {
  const router = readFileSync(resolve(process.cwd(), "server/routers/community.ts"), "utf8");
  const upload = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");
  const oralForm = readFileSync(resolve(process.cwd(), "client/src/pages/admin/OralMemoryUploadAdmin.tsx"), "utf8");
  const notifications = readFileSync(resolve(process.cwd(), "client/src/pages/admin/CareNotificationsAdmin.tsx"), "utf8");

  it("aceita áudio no armazenamento e exige consentimento explícito para a memória oral", () => {
    expect(upload).toContain('"audio/*"');
    expect(router).toContain("createMemoryWithConsent");
    expect(router).toContain("consentAccepted: z.literal(true)");
    expect(router).toContain('input.consentStatus !== "Autorizado"');
    expect(oralForm).toContain('accept="audio/*,video/*"');
    expect(oralForm).toContain("Termo de consentimento obrigatório");
  });

  it("mantém as notificações de acolhimento dentro da carteira privada", () => {
    expect(notifications).toContain("trpc.community.listCareRequests.useQuery");
    expect(notifications).toContain("Registrar resposta privada");
    expect(notifications).toContain("Privado por padrão");
    expect(router).toContain("listCareRequests: protectedProcedure");
  });
});
