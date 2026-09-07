import { describe, expect, it } from "vitest";
import { decodePartnerVocations, encodePartnerVocations, partnerDoorKeys, partnerReceivesCoverageOffers } from "./partnerVocations";

describe("ofícios do Parceiro Ojú", () => {
  it("guarda fotógrafo e história maker juntos", () => {
    expect(encodePartnerVocations(["Fotógrafo / videomaker", "História maker"])).toBe("Fotógrafo / videomaker · História maker");
    expect(decodePartnerVocations("Fotografia, Vídeo").map(item => item.id)).toEqual(["fotografo-videomaker"]);
    expect(decodePartnerVocations("Histórias · Fotografia documental").map(item => item.id)).toEqual(["historia-maker", "fotografo-videomaker"]);
  });

  it("fotógrafo recebe pedido da região; história maker sozinho não", () => {
    expect(partnerReceivesCoverageOffers("Fotógrafo / videomaker")).toBe(true);
    expect(partnerReceivesCoverageOffers("História maker")).toBe(false);
    expect(partnerReceivesCoverageOffers("Casa de mídia / equipe")).toBe(true);
    expect(partnerDoorKeys("História maker").has("historias")).toBe(true);
    expect(partnerDoorKeys("História maker").has("ofertas")).toBe(false);
    expect(partnerDoorKeys("Fotógrafo / videomaker").has("ofertas")).toBe(true);
  });
});
