import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  formatAdminId,
  formatGovernanceCaseCode,
  isAccountOperable,
  isClosedCaseStatus,
  nextSessionEpoch,
  parseAdminId,
  sessionIsRevoked,
  stripSensitiveAuditValue,
} from "@shared/governance";
import { GovernanceHoldError } from "./governance";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("identidade permanente do administrador", () => {
  it("deriva Admin ID estável a partir do users.id, sem e-mail ou Google sub", () => {
    expect(formatAdminId(12)).toBe("ADMIN-00000012");
    expect(parseAdminId("ADMIN-00000012")).toBe(12);
    expect(parseAdminId("admin-12")).toBe(12);
    expect(parseAdminId("pessoa@gmail.com")).toBeNull();
    expect(formatAdminId(12)).not.toContain("@");
  });
});

describe("ciclo de vida da conta administrativa", () => {
  it("só Ativo opera; suspensão incrementa epoch e invalida sessão anterior", () => {
    expect(isAccountOperable("Ativo")).toBe(true);
    expect(isAccountOperable("Suspenso")).toBe(false);
    expect(isAccountOperable("Bloqueado")).toBe(false);
    expect(isAccountOperable("Revogado")).toBe(false);
    expect(nextSessionEpoch(0)).toBe(1);
    expect(sessionIsRevoked(0, 1)).toBe(true);
    expect(sessionIsRevoked(1, 1)).toBe(false);
    expect(sessionIsRevoked(undefined, 0)).toBe(false);
  });
});

describe("denúncia versus violação e preservação", () => {
  it("gera Incident/Report ID sequencial e distingue encerramento", () => {
    expect(formatGovernanceCaseCode(2026, 1)).toBe("DEN-2026-000001");
    expect(isClosedCaseStatus("Aberta")).toBe(false);
    expect(isClosedCaseStatus("Rejeitada")).toBe(true);
    expect(isClosedCaseStatus("Resolvida")).toBe(true);
  });

  it("remove segredos do pacote e calcula SHA-256 do JSON", () => {
    const clean = stripSensitiveAuditValue({ publicCode: "DEN-2026-000001", token: "abc", refresh_token: "x", jwt: "y" }) as Record<string, unknown>;
    expect(clean.publicCode).toBe("DEN-2026-000001");
    expect(clean.token).toBeUndefined();
    expect(clean.refresh_token).toBeUndefined();
    const serialized = JSON.stringify(clean);
    expect(createHash("sha256").update(serialized).digest("hex")).toHaveLength(64);
  });

  it("expurgo é bloqueado por preservação", () => {
    expect(new GovernanceHoldError().message).toMatch(/preservação de evidência/);
  });
});

describe("contratos de governança no backend", () => {
  it("reutiliza grants, auditoria kebab-case, checksum SHA-256 e não promove Super Admin", () => {
    const collaborators = source("server/routers/collaborators.ts");
    const oauth = source("server/_core/oauth.ts");
    const sdk = source("server/_core/sdk.ts");
    const schema = source("drizzle/schema.ts");
    const trash = source("server/editorialTrash.ts");
    const media = source("server/mediaLifecycle.ts");
    expect(collaborators).toContain("setAccountStatus");
    expect(collaborators).toContain("Não é permitido alterar o próprio escopo");
    expect(collaborators).toContain("A Equipe Ojú / Super Admin não pode ser suspensa");
    expect(collaborators).toContain("formatAdminId");
    expect(oauth).toContain("conta suspensa, bloqueada ou revogada");
    expect(sdk).toContain("sessionIsRevoked");
    expect(schema).toContain("governanceCases");
    expect(schema).toContain("governanceLegalHolds");
    expect(schema).toContain('accountStatus: mysqlEnum("accountStatus"');
    expect(trash).toContain("assertResourcePurgeAllowed");
    expect(media).toContain("assertResourcePurgeAllowed");
    expect(source("server/routers/collaborators.ts")).toContain('["criador", "editor", "aprovador", "administrador"]');
    expect(source("server/_core/env.ts")).toContain("isAuthorizedSuperAdmin");
  });

  it("quarentena some do portal sem destruir arquivo e rejeição restaura", () => {
    const editorial = source("server/routers/editorial.ts");
    const gov = source("server/governance.ts");
    const router = source("server/routers/governance.ts");
    expect(editorial).toContain("isNull(publications.quarantinedAt)");
    expect(editorial).toContain("Este conteúdo está em quarentena e não pode ser alterado");
    expect(gov).toContain("Arquivo original não é destruído");
    expect(gov).toContain("liftPublicationQuarantine");
    expect(router).toContain("Não confirmada");
    expect(router).toContain("exportEvidence");
    expect(source("client/src/App.tsx")).toContain("/admin/denuncias");
  });
});
