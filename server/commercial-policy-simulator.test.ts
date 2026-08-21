import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("simulador visual de políticas comerciais", () => {
  it("calcula a distribuição apenas no navegador e deixa explícito que não persiste valores", () => {
    const page = source("client/src/pages/admin/CommercialPoliciesAdmin.tsx");
    expect(page).toContain("Ambiente de simulação");
    expect(page).toContain("Testar sem persistir.");
    expect(page).toContain("não cria política, não altera uma política ativa, não grava valores e não dispara repasses");
    expect(page).toContain("const simulatedBase");
    expect(page).toContain("const simulated =");
  });
});
