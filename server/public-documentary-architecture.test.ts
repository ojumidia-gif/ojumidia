import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("arquitetura pública documental", () => {
  it("mantém Memórias Documentais separada de uma vitrine comercial", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/DocumentaryMemories.tsx"), "utf8");
    const content = readFileSync(resolve(process.cwd(), "client/src/lib/portalContent.ts"), "utf8");
    expect(page).toContain('usePortalContent("Memórias Documentais")');
    expect(content).toContain("Esta não é uma vitrine de serviços.");
    expect(page).toContain("autorizações editoriais");
    expect(page).not.toContain("Portfólio");
  });

  it("encaminha Planejar um registro para a solicitação comercial existente com consentimento", () => {
    const form = readFileSync(resolve(process.cwd(), "client/src/components/PlanningRegistrationForm.tsx"), "utf8");
    expect(form).toContain("trpc.commercial.requestCoverage.useMutation");
    expect(form).toContain("if (!consent)");
    expect(form).toContain("Origem: formulário público Planejar um registro.");
  });
});
