import { describe, expect, it } from "vitest";
import { orderOperationalPendencies } from "./routers/operations";

describe("Central de Pendências Operacionais", () => {
  it("prioriza criticidade, depois prazo e por fim atividade mais recente", () => {
    const ordered = orderOperationalPendencies([
      { id: "follow", category: "Mídia", priority: "Acompanhamento", title: "Upload", description: "", href: "/admin/midias", createdAt: new Date("2026-08-20"), dueAt: null, partnerId: null, territoryId: null },
      { id: "attention", category: "Editorial", priority: "Atenção", title: "Revisão", description: "", href: "/admin/publicacoes", createdAt: new Date("2026-08-21"), dueAt: null, partnerId: null, territoryId: null },
      { id: "critical-later", category: "Financeiro", priority: "Crítica", title: "Reembolso", description: "", href: "/admin/politicas-comerciais", createdAt: new Date("2026-08-20"), dueAt: new Date("2026-08-24"), partnerId: null, territoryId: null },
      { id: "critical-first", category: "Lixeira", priority: "Crítica", title: "Expurgo", description: "", href: "/admin/lixeira-editorial", createdAt: new Date("2026-08-20"), dueAt: new Date("2026-08-22"), partnerId: null, territoryId: null },
    ]);
    expect(ordered.map(item => item.id)).toEqual(["critical-first", "critical-later", "attention", "follow"]);
  });
});
