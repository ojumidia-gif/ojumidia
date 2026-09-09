import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canSetNationalVoiceCuration,
  canTransitionNetworkVoice,
  compareNetworkVoicesForPublicPresentation,
  isNetworkVoiceNationallyCurated,
  isNetworkVoicePubliclyVisible,
  nextNetworkVoiceStatus,
  publicSpeakerLabel,
} from "@shared/networkVoices";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Vozes da Rede Ojú", () => {
  it("separa envio, aprovação, publicação e curadoria sem ranking", () => {
    expect(nextNetworkVoiceStatus("Aguardando análise", "approve")).toBe("Aprovado");
    expect(isNetworkVoicePubliclyVisible("Aprovado")).toBe(false);
    expect(isNetworkVoicePubliclyVisible("Publicado")).toBe(true);
    expect(canTransitionNetworkVoice("Publicado", "unpublish")).toBe(true);
    expect(isNetworkVoiceNationallyCurated({ status: "Publicado", curationScope: "Nenhum" })).toBe(false);
    expect(isNetworkVoiceNationallyCurated({ status: "Publicado", curationScope: "Nacional" })).toBe(true);
    expect(canSetNationalVoiceCuration("administrador")).toBe(false);
    expect(canSetNationalVoiceCuration("administrador principal")).toBe(true);
  });

  it("não usa created_at nem popularidade para apresentar depoimentos públicos", () => {
    const ordered = [
      { curationDisplayOrder: 2, speakerName: "Ana" },
      { curationDisplayOrder: 1, speakerName: "Bia" },
      { curationDisplayOrder: 1, speakerName: "Ada" },
    ].sort(compareNetworkVoicesForPublicPresentation);
    expect(ordered.map(item => item.speakerName)).toEqual(["Ada", "Bia", "Ana"]);
    expect(publicSpeakerLabel({ speakerName: "Casa X", speakerNameVisibility: "Não divulgar" })).toBeNull();
    const router = source("server/routers/networkVoices.ts");
    expect(router).not.toMatch(/desc\(networkVoices\.createdAt\)/);
    expect(router).not.toMatch(/estrela|starRating|likeCount|voteCount/i);
    expect(router).toContain("protectedProcedure");
    expect(router).toContain('publicPublished: publicProcedure');
    expect(router).toContain("voice-curate");
    expect(router).toContain("voice-link-context");
  });

  it("não mistura depoimento com memória oral nem com publicação 5+1", () => {
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain("networkVoices");
    expect(schema).not.toMatch(/contentKind.*Depoimento/);
    expect(source("drizzle/0056_network_voices.sql")).toContain("CREATE TABLE `networkVoices`");
    expect(source("drizzle/0056_network_voices.sql")).toContain("NÃO aplicar em Aiven/Beta");
  });
});
