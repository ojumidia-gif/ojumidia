import { describe, expect, it } from "vitest";
import { isPartnerHiddenAdminPath, isPrincipalOnlyAdminPath, visibleAdminNav } from "./adminNav";

describe("rotas administrativas restritas ao Super Admin", () => {
  it("esconde o que muda o site do Admin comum e deixa miniclipe de produção", () => {
    const labels = visibleAdminNav("administrador").flatMap(group => group.items.map(item => item.href));
    expect(labels).toContain("/admin/publicacoes");
    expect(labels).toContain("/admin/guia");
    expect(labels).toContain("/admin/canal");
    expect(labels).toContain("/admin/territorios");
    expect(labels).toContain("/admin/fotografos");
    expect(labels).toContain("/admin/midias");
    expect(labels).toContain("/admin/miniclipes");
    expect(labels).toContain("/admin/equipes");
    expect(isPrincipalOnlyAdminPath("/admin/equipes")).toBe(false);
    expect(labels).toContain("/admin/solicitacoes");
    expect(labels).toContain("/admin/ganhos");
    expect(labels).not.toContain("/admin/configuracoes");
    expect(labels).not.toContain("/admin/conteudo-portal");
    expect(labels).not.toContain("/admin/destaques");
    expect(labels).not.toContain("/admin/retencao");
    expect(labels).not.toContain("/admin/auditoria");
    expect(labels).not.toContain("/admin/anuncios");
    expect(isPrincipalOnlyAdminPath("/admin/auditoria")).toBe(true);
    expect(isPrincipalOnlyAdminPath("/admin/anuncios/12")).toBe(true);
    expect(isPrincipalOnlyAdminPath("/admin/destaques")).toBe(true);
    expect(isPrincipalOnlyAdminPath("/admin/configuracoes")).toBe(true);
    expect(isPrincipalOnlyAdminPath("/admin/home-preview/12")).toBe(true);
    expect(isPrincipalOnlyAdminPath("/admin/miniclipes")).toBe(false);
    expect(isPrincipalOnlyAdminPath("/admin/publicacoes")).toBe(false);
  });

  it("mostra a caixa do Canal Ojú no menu do Super Admin, sem mudar o atalho do admin comum", () => {
    const principal = visibleAdminNav("administrador principal").flatMap(group => group.items);
    const common = visibleAdminNav("administrador").flatMap(group => group.items);
    expect(principal.find(item => item.href === "/admin/canal")?.label).toBe("Caixa Canal Ojú");
    expect(common.find(item => item.href === "/admin/canal")?.label).toBe("Canal Ojú");
  });

  it("deixa o painel do parceiro só com o trabalho do território, sem CMS do site", () => {
    const groups = visibleAdminNav("administrador", true);
    const hrefs = groups.flatMap(group => group.items.map(item => item.href));
    expect(groups.find(group => group.id === "content")?.label).toBe("Seu trabalho");
    expect(groups.find(group => group.id === "content")?.items.find(item => item.href === "/admin/publicacoes")?.label).toBe("Escrever");
    expect(hrefs).toContain("/admin/publicacoes");
    expect(hrefs).toContain("/admin/midias");
    expect(hrefs).toContain("/admin/miniclipes");
    expect(hrefs).toContain("/admin/comunidade");
    expect(hrefs).not.toContain("/admin/destaques");
    expect(hrefs).not.toContain("/admin/conteudo-portal");
    expect(hrefs).not.toContain("/admin/configuracoes");
    expect(hrefs).not.toContain("/admin/pendencias");
    expect(hrefs).not.toContain("/admin/ganhos");
    expect(hrefs).not.toContain("/admin/contratos");
    expect(isPartnerHiddenAdminPath("/admin/ganhos")).toBe(true);
    expect(isPartnerHiddenAdminPath("/admin/publicacoes")).toBe(false);
  });
});
