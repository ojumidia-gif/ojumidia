import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  decodeSpecialties,
  encodeSpecialties,
  resolveNetworkBond,
  specialtyIdsOf,
  specialtiesReceiveCoverageOffers,
  specialtyGrantsPrivilege,
  bondGrantsPrivilege,
  professionalSpecialtyIds,
  professionalSpecialties,
} from "./professionalSpecialties";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Fase 1 — especialidade × vínculo × permissão", () => {
  it("aceita várias especialidades na mesma pessoa", () => {
    expect(specialtyIdsOf(["Fotógrafo", "Videomaker", "Historymaker"])).toEqual(["fotografo", "videomaker", "historymaker"]);
    expect(encodeSpecialties(["fotografo", "historymaker"])).toBe("Fotógrafo · Historymaker");
  });

  it("lê candidatura antiga sem apagar o sentido", () => {
    expect(decodeSpecialties("Fotografia, Vídeo").map(item => item.id)).toEqual(["fotografo", "videomaker"]);
    expect(decodeSpecialties("Fotógrafo / videomaker · História maker").map(item => item.id)).toEqual(["fotografo", "videomaker", "historymaker"]);
    expect(decodeSpecialties("Histórias · Fotografia documental").map(item => item.id)).toEqual(["historymaker", "fotografo"]);
  });

  it("grava candidatura nova com rótulo normalizado", () => {
    expect(encodeSpecialties(["fotografo", "jornalista"])).toBe("Fotógrafo · Jornalista");
  });

  it("vínculo de mídia própria não troca a especialidade", () => {
    const specialties = specialtyIdsOf(["Fotógrafo", "Historymaker"]);
    expect(resolveNetworkBond({ hasOwnMedia: true })).toBe("parceiro-midia");
    expect(resolveNetworkBond({ bond: "criador-parceiro" })).toBe("criador-parceiro");
    expect(specialtyIdsOf(["Fotógrafo", "Historymaker"])).toEqual(specialties);
  });

  it("especialidade não é papel de segurança", () => {
    expect(source("drizzle/schema.ts")).toContain('role: mysqlEnum("role", ["criador", "editor", "aprovador", "administrador", "administrador principal"])');
    expect(source("drizzle/schema.ts")).not.toMatch(/role: mysqlEnum\("role".*fotografo/i);
    expect(source("server/db.ts")).not.toContain("specialty");
    expect(source("server/db.ts")).toContain("isAuthorizedSuperAdmin");
    expect(source("server/db.ts")).toContain("grant.role");
  });

  it("não altera OAuth", () => {
    expect(source("server/_core/oauth.ts")).not.toContain("professionalProfiles");
    expect(source("server/_core/oauth.ts")).not.toContain("specialty");
    expect(source("server/loginSideEffects.ts")).toContain("attachProfessionalProfileUser");
    expect(source("server/loginSideEffects.ts")).not.toContain("values.role");
  });
});

describe("cobertura a partir de especialidade", () => {
  it("fotógrafo recebe oferta; historymaker sozinho não", () => {
    expect(specialtiesReceiveCoverageOffers(["fotografo"])).toBe(true);
    expect(specialtiesReceiveCoverageOffers(["historymaker"])).toBe(false);
  });
});

describe("Fase 2 — identidade profissional utilizável sem privilégio", () => {
  it("nenhuma especialidade concede administração, publicação, aprovação, comercial ou nacional", () => {
    const privileges = ["administrador", "editor", "aprovador", "publicar", "aprovar", "comercial", "nacional", "canPublishDirect"];
    for (const id of professionalSpecialtyIds) {
      for (const privilege of privileges) {
        expect(specialtyGrantsPrivilege(id, privilege)).toBe(false);
      }
    }
    expect(professionalSpecialties.map(item => item.label)).toEqual([
      "Fotógrafo",
      "Videomaker",
      "Jornalista",
      "Documentarista",
      "Historymaker",
      "Pesquisador",
      "Produtor cultural",
      "Criador de conteúdo",
      "Colaborador editorial",
    ]);
  });

  it("vínculo não concede permissão por si só e não troca especialidade", () => {
    expect(bondGrantsPrivilege("criador-parceiro", "administrador")).toBe(false);
    expect(bondGrantsPrivilege("parceiro-midia", "administrador")).toBe(false);
    expect(bondGrantsPrivilege("independente", "editor")).toBe(false);
    const specialties = specialtyIdsOf(["Fotógrafo", "Videomaker"]);
    expect(resolveNetworkBond({ bond: "parceiro-midia" })).toBe("parceiro-midia");
    expect(specialties).toEqual(["fotografo", "videomaker"]);
  });

  it("hasOwnMedia e mediaOutlet não viram diretório paralelo", () => {
    expect(source("drizzle/schema.ts")).toContain("hasOwnMedia");
    expect(source("drizzle/schema.ts")).toContain("export const mediaOutlets");
    expect(source("client/src/App.tsx")).not.toContain("/midias-proprias");
    expect(source("client/src/App.tsx")).toContain("/fotografos");
    expect(source("server/routers/network.ts")).toContain("networkExecutors");
  });

  it("practice legado permanece na candidatura", () => {
    expect(source("drizzle/schema.ts")).toContain('practice: varchar("practice", { length: 280 }).notNull()');
    expect(source("server/routers/joinRequests.ts")).toContain("practice,");
    expect(source("server/routers/joinRequests.ts")).toContain("encodeSpecialties");
    expect(source("client/src/pages/admin/JoinRequestsAdmin.tsx")).toContain("Registro original (practice)");
  });

  it("publicação direta e aprovação continuam só no RBAC editorial", () => {
    expect(source("server/editorialPolicy.ts")).toContain("export function canPublishDirect(role: EditorialRole)");
    expect(source("server/editorialPolicy.ts")).not.toMatch(/canPublishDirect\([^)]*specialty/);
    expect(source("server/editorialPolicy.ts")).not.toContain("fotografo");
    expect(source("server/editorialPolicy.ts")).toContain('Aprovada: ["administrador", "administrador principal"]');
    expect(source("server/editorialPolicy.ts")).toContain('"Em revisão": ["aprovador", "administrador", "administrador principal"]');
  });

  it("Super Admin e Homolog A/B não dependem de especialidade", () => {
    expect(source("server/db.ts")).toContain("isAuthorizedSuperAdmin");
    expect(source("scripts/homologate-admin-cms.ts")).toContain("Admin Homolog A");
    expect(source("scripts/homologate-admin-cms.ts")).toContain("Admin Homolog B");
    expect(source("scripts/homologate-admin-cms.ts")).toContain('"administrador"');
    expect(source("scripts/homologate-admin-cms.ts")).not.toContain("professionalSpecialty");
    expect(source("server/_core/oauth.ts")).not.toContain("professionalProfiles");
  });

  it("cadastro público descreve especialidades e pede vínculo", () => {
    expect(source("shared/professionalSpecialties.ts")).toContain("Registra acontecimentos, pessoas, territórios e memórias por meio da fotografia.");
    expect(source("client/src/pages/BePartner.tsx")).toContain("Como você quer participar da Rede Ojú?");
    expect(source("client/src/pages/BePartner.tsx")).toContain("Já tenho");
  });
});
