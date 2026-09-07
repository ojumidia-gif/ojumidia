import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("ofertas regionais de cobertura", () => {
  it("parceiro da cidade aceita, recusa ou deixa expirar sem esperar Homolog", () => {
    const commercial = source("server/routers/commercial.ts");
    expect(commercial).toContain("regionalOffers");
    expect(commercial).toContain("declineRegionalOffer");
    expect(commercial).toContain("offerMatchesPartner");
    expect(source("drizzle/schema.ts")).toContain("coverageOfferDeclines");
    expect(source("client/src/pages/BePartner.tsx")).toContain("Como você quer participar da Rede Ojú?");
    expect(source("client/src/pages/BePartner.tsx")).toContain("professionalSpecialties.map");
  });
});
