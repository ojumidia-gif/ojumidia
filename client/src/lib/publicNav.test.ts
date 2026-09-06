import { describe, expect, it } from "vitest";
import { groupPublicNav, OJU_INSTAGRAM_HANDLE, OJU_INSTAGRAM_URL, publicNavGroups } from "./publicNav";

describe("navegação Olhar, Chão e Chamar a Ojú", () => {
  it("agrupa as seções públicas sem inventar destino", () => {
    expect(publicNavGroups.map(item => item.label)).toEqual(["Olhar", "Chão", "Chamar a Ojú"]);
    expect(OJU_INSTAGRAM_HANDLE).toBe("@oju.fotografia");
    expect(OJU_INSTAGRAM_URL).toBe("https://instagram.com/oju.fotografia");
    const { grouped, rest } = groupPublicNav([
      { label: "Histórias", href: "/historias" },
      { label: "Territórios", href: "/territorios" },
      { label: "Chamar a Ojú", href: "/planejar-um-registro" },
      { label: "Sobre", href: "/sobre" },
    ]);
    expect(publicNavGroups[0].hrefs).toContain("/fotografia-documental");
    expect(grouped[0].items[0].href).toBe("/historias");
    expect(grouped[1].items[0].href).toBe("/territorios");
    expect(grouped[2].items[0].href).toBe("/planejar-um-registro");
    expect(rest.map(item => item.href)).toEqual(["/sobre"]);
  });
});
