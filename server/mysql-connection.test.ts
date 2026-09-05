import { describe, expect, it } from "vitest";
import { mysqlConnectionFromUrl } from "./mysqlConnection";

describe("conexão MySQL compatível com Aiven", () => {
  it("remove ssl-mode da URL e aplica SSL que o mysql2 entende", () => {
    const parsed = mysqlConnectionFromUrl("mysql://user:pass@db.example:12345/app?ssl-mode=REQUIRED");
    expect(parsed.uri).not.toContain("ssl-mode");
    expect(parsed.ssl).toEqual({ rejectUnauthorized: false });
  });

  it("preserva o JSON ssl de provedores que já usam a opção nativa", () => {
    const parsed = mysqlConnectionFromUrl(`mysql://user:pass@host:4000/db?ssl=${encodeURIComponent(JSON.stringify({ rejectUnauthorized: true }))}`);
    expect(parsed.uri).not.toContain("ssl=");
    expect(parsed.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("exige verificação de certificado apenas em VERIFY_CA e VERIFY_IDENTITY", () => {
    expect(mysqlConnectionFromUrl("mysql://u:p@h:3306/db?ssl-mode=VERIFY_CA").ssl).toEqual({ rejectUnauthorized: true });
  });

  it("não liga SSL quando o modo é DISABLED", () => {
    const parsed = mysqlConnectionFromUrl("mysql://user:pass@host:3306/db?ssl-mode=DISABLED");
    expect(parsed.ssl).toBeUndefined();
  });
});
