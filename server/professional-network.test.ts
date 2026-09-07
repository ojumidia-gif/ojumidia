import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("perfil profissional da Rede", () => {
  it("perfil é tabela própria, ligada ao user, sem substituir users.role", () => {
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain("professionalProfiles");
    expect(schema).toContain("professionalProfileSpecialties");
    expect(schema).toContain("mediaOutlets");
    expect(schema).toContain("professionalProfileId");
    expect(source("server/professionalNetwork.ts")).toContain("upsertProfessionalProfile");
    expect(source("server/professionalNetwork.ts")).toContain("replaceProfileSpecialties");
    expect(source("server/professionalNetwork.ts")).not.toContain("ensureProfessionalNetworkTables");
    expect(source("server/professionalNetwork.ts")).not.toMatch(/CREATE TABLE|ALTER TABLE/i);
    expect(source("drizzle/0050_network_opportunities.sql")).toContain("CREATE TABLE IF NOT EXISTS `networkOpportunities`");
    expect(source("server/routers/joinRequests.ts")).not.toContain("ensureProfessionalNetworkTables");
    expect(source("drizzle/0049_professional_network.sql")).toContain("CREATE TABLE IF NOT EXISTS `professionalProfiles`");
    expect(source("server/routers/collaborators.ts")).toContain("Especialidade gravada no perfil profissional");
    expect(source("server/routers/collaborators.ts")).toContain('role: "administrador" as const');
    expect(source("drizzle/schema.ts")).toContain("territoryId: int(\"territoryId\")");
    expect(source("drizzle/0049_professional_network.sql")).toContain("`territoryId` int");
    expect(source("server/routers/network.ts")).toContain("attachExecutorRecordToProfile");
    expect(source("server/routers/network.ts")).toContain("withProfessionalDirectory");
    expect(source("client/src/pages/admin/PhotographersAdmin.tsx")).toContain("item.professional");
    expect(source("client/src/pages/admin/PhotographersAdmin.tsx")).not.toContain("mysqlTable(\"photographers\"");
  });

  it("candidatura pública grava especialidade normalizada e vínculo", () => {
    const join = source("server/routers/joinRequests.ts");
    expect(join).toContain("upsertProfessionalProfile");
    expect(join).toContain("encodeSpecialties");
    expect(join).toContain("networkBond");
    expect(source("client/src/pages/BePartner.tsx")).toContain("Como você quer participar da Rede Ojú?");
    expect(source("client/src/pages/BePartner.tsx")).toContain("professionalSpecialties.map");
  });
});
