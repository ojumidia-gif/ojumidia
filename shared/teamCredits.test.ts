import { describe, expect, it } from "vitest";
import { groupDuplicateTeamIds, pickReusableTeam, teamNameKey } from "./teamCredits";
import { isRoutineAuditAction, labelAuditAction } from "./auditView";

describe("crédito de equipe sem duplicar cadastro", () => {
  it("reaproveita a primeira equipe ativa com o mesmo nome, ignorando acento e caixa", () => {
    expect(teamNameKey("Equipe Ojú")).toBe("equipe oju");
    const keep = pickReusableTeam([
      { id: 3, name: "equipe ojú", archivedAt: null },
      { id: 9, name: "Equipe Ojú", archivedAt: null },
      { id: 1, name: "Equipe Ojú", archivedAt: new Date() },
    ], "EQUIPE OJU");
    expect(keep?.id).toBe(3);
  });

  it("agrupa duplicatas ativas para o Super Admin unificar", () => {
    const groups = groupDuplicateTeamIds([
      { id: 2, name: "Homolog A", archivedAt: null },
      { id: 5, name: "Equipe Homolog A", archivedAt: null },
      { id: 8, name: "Homolog A", archivedAt: null },
    ]);
    expect(groups).toEqual([{ keepId: 2, absorbIds: [8] }]);
  });
});

describe("auditoria legível", () => {
  it("separa rotina de governança e traduz ações", () => {
    expect(isRoutineAuditAction("upload-session-cleaned")).toBe(true);
    expect(isRoutineAuditAction("publication-permanently-purged")).toBe(false);
    expect(labelAuditAction("publication-trashed")).toBe("Enviado à lixeira");
  });
});
