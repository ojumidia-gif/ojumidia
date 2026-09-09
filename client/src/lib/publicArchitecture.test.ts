import { describe, expect, it } from "vitest";
import { isDocumentaryMemoryKind, ojuMethod, ojuMethodCare, publicNavigation } from "./publicArchitecture";

describe("arquitetura pública documental", () => {
  it("prioriza as cinco entradas aprovadas sem transformar a navegação em portfólio", () => {
    expect(publicNavigation.map(item => item.label)).toEqual([
      "Olhar",
      "Chão",
      "Chamar a Ojú",
      "Serviços",
      "Sobre",
    ]);
    expect(publicNavigation.some(item => item.label.toLowerCase().includes("portfólio"))).toBe(false);
  });

  it("mantém cinco etapas autorais de cuidado antes da câmera", () => {
    expect(ojuMethod).toHaveLength(5);
    expect(ojuMethod.map(item => item.title)).toContain("Memória autorizada");
    expect(ojuMethod.map(item => item.description).join(" ")).toMatch(/autoria|crédito/i);
    expect(ojuMethodCare).toHaveLength(7);
    expect(ojuMethodCare.join(" ")).not.toMatch(/a lei protege|logo está protegida/i);
  });

  it("considera somente frentes documentais como candidatas a memória pública", () => {
    expect(isDocumentaryMemoryKind("Cobertura")).toBe(true);
    expect(isDocumentaryMemoryKind("Fotografia documental")).toBe(true);
    expect(isDocumentaryMemoryKind("História")).toBe(false);
  });
});
