import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isPublicJoinEmail, publicJoinEmail } from "./joinRequestsTable";

describe("candidaturas públicas", () => {
  it("não cria a tabela em runtime; schema vem da migration", () => {
    const table = readFileSync(resolve(process.cwd(), "server/joinRequestsTable.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers/joinRequests.ts"), "utf8");
    expect(table).not.toMatch(/CREATE TABLE|ALTER TABLE/i);
    expect(table).toContain("Não foi possível registrar o pedido agora");
    expect(router).toContain("ensureAdminJoinRequestsTable");
    expect(router).toContain("hideJoinRequestSql");
    expect(router).toContain("isPublicJoinEmail");
    expect(router).not.toContain("inArray(adminJoinRequests.status");
  });

  it("aceita qualquer e-mail pessoal, não só Google", () => {
    expect(isPublicJoinEmail("Natalia@bol.com.br")).toBe(true);
    expect(isPublicJoinEmail(" casa@territorio.org ")).toBe(true);
    expect(publicJoinEmail("Natalia@bol.com.br")).toBe("natalia@bol.com.br");
    expect(isPublicJoinEmail("sem-arroba")).toBe(false);
  });
});
