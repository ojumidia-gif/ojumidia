import { describe, expect, it } from "vitest";
import { commercialOperationEvents } from "./commercial";

const request = {
  proposalSummary: null,
  proposalAmount: null,
  deliveryDetails: null,
  deliveryUrl: null,
  deliveredAt: null,
  editorialAuthorized: false,
};

describe("trilha operacional comercial", () => {
  it("registra cada marco privado relevante em uma atualização operacional", () => {
    const events = commercialOperationEvents(request, {
      proposalSummary: "Escopo alinhado",
      proposalAmount: 1200,
      deliveryDetails: "Link privado enviado",
      delivered: true,
      editorialAuthorized: true,
    });
    expect(events.map(event => event.activityType)).toEqual(["Proposta", "Entrega privada", "Autorização editorial"]);
  });

  it("não cria eventos quando a atualização não altera o estado já registrado", () => {
    expect(commercialOperationEvents(request, { editorialAuthorized: false, delivered: false })).toEqual([]);
  });
});

