import { describe, expect, it } from "vitest";
import { legalDocuments, mergeLegalFooterItems, requiredLegalLinks } from "./legalDocuments";

describe("termos de uso e LGPD", () => {
  it("publica termos e privacidade com encarregado e direitos do titular", () => {
    expect(legalDocuments.terms.href).toBe("/termos-de-uso");
    expect(legalDocuments.privacy.href).toBe("/privacidade");
    expect(legalDocuments.privacy.sections.some(section => section.title.includes("direitos"))).toBe(true);
    expect(legalDocuments.privacy.sections.flatMap(section => section.paragraphs).join(" ")).toMatch(/LGPD|13\.709/);
    expect(legalDocuments.privacy.sections.flatMap(section => section.paragraphs).join(" ")).toMatch(/ANPD/);
    expect(legalDocuments.terms.sections.flatMap(section => section.paragraphs).join(" ")).not.toMatch(/Super Admin/i);
    expect(legalDocuments.privacy.sections.flatMap(section => section.paragraphs).join(" ")).not.toMatch(/Super Admin/i);
    expect(requiredLegalLinks.map(item => item.href)).toEqual(["/termos-de-uso", "/privacidade", "/cuidado-e-consentimento"]);
  });

  it("completa o rodapé mesmo se o CMS antigo não tiver os links legais", () => {
    const merged = mergeLegalFooterItems([{ label: "Cuidado e consentimento", href: "/cuidado-e-consentimento" }]);
    expect(merged.map(item => item.href)).toEqual(["/cuidado-e-consentimento", "/termos-de-uso", "/privacidade"]);
  });
});
