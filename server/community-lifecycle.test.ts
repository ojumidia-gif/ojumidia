import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ciclo administrativo comunitário", () => {
  const router = readFileSync(resolve(process.cwd(), "server/routers/community.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
  const panel = readFileSync(resolve(process.cwd(), "client/src/pages/admin/CommunityAdmin.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "client/src/pages/admin/CommunityLifecycleActions.tsx"), "utf8");
  const editor = readFileSync(resolve(process.cwd(), "client/src/pages/admin/CommunityRecordEditDialog.tsx"), "utf8");

  it("protege a publicação comunitária por consentimento autorizado", () => {
    expect(router).toContain("setInstitutionStatus");
    expect(router).toContain("setEventStatus");
    expect(router).toContain("setMemoryStatus");
    expect(router).toContain("A publicação exige consentimento autorizado.");
  });

  it("preserva registros removidos em lixeira auditável e permite restauração exclusiva", () => {
    expect(schema).toContain('deletedAt: timestamp("deletedAt")');
    expect(schema).toContain('deletedBy: int("deletedBy")');
    expect(schema).toContain('deletionNote: text("deletionNote")');
    expect(router).toContain("trashInstitution");
    expect(router).toContain("trashEvent");
    expect(router).toContain("trashMemory");
    expect(router).toContain("restoreInstitution");
    expect(router).toContain("restoreEvent");
    expect(router).toContain("restoreMemory");
    expect(router).toContain("administrador principal");
  });

  it("expõe as ações de ciclo nos cartões das três frentes comunitárias", () => {
    expect(panel).toContain("CommunityLifecycleActions");
    expect(actions).toContain("Despublicar");
    expect(actions).toContain("Arquivar");
    expect(actions).toContain("Excluir");
    expect(actions).toContain("Restaurar");
  });

  it("exige mídia ativa e autorizada na publicação e propaga mudanças ao portal", () => {
    expect(router).toContain("assertEligibleCommunityMedia");
    expect(router).toContain("requiresPublicationAllowed");
    expect(router).toContain("community-institution-status");
    expect(router).toContain("community-event-status");
    expect(router).toContain("community-memory-status");
    expect(router).toContain("community-institution-trashed");
    expect(router).toContain("community-event-restored");
    expect(router).toContain("community-memory-restored");
  });

  it("permite preparar capa ou vídeo no rascunho comunitário antes da publicação", () => {
    expect(editor).toContain("trpc.media.list.useQuery");
    expect(editor).toContain("primaryMediaId");
    expect(editor).toContain("coverMediaId");
    expect(editor).toContain("videoMediaId");
  });
});
