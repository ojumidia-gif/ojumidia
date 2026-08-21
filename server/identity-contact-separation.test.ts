import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("separação entre contato e identidade administrativa", () => {
  it("documenta que o contato comercial não concede privilégios", () => {
    const policy = source("docs/IDENTIDADE_E_ACESSO.md");
    expect(policy).toContain("ojumidia@gmail.com");
    expect(policy).toContain("não cria, eleva ou recupera privilégios administrativos");
    expect(policy).toContain("Contas Google próprias");
  });

  it("mantém a regra visível somente no contexto administrativo e no contato público", () => {
    const settings = source("client/src/pages/admin/SettingsAdmin.tsx");
    const contact = source("client/src/pages/Contact.tsx");
    expect(settings).toContain("contas Google autorizadas individualmente");
    expect(contact).toContain("E-mail institucional");
  });

  it("evita uma elevação administrativa vinculada ao e-mail comercial", () => {
    const db = source("server/db.ts");
    expect(db).toContain("isLocalPrimaryAdmin");
    expect(db).not.toContain("isLocalOjuAdmin");
  });
});
