import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TERMS_OF_USE_VERSION } from "../shared/legalVersions";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("arquitetura de autorização: conta ≠ gov.br ≠ CMS", () => {
  it("distingue authenticatedProcedure de protectedProcedure/adminAccess", () => {
    const trpc = source("server/_core/trpc.ts");
    expect(trpc).toContain("export const authenticatedProcedure");
    expect(trpc).toContain("export const protectedProcedure");
    expect(trpc).toContain("adminAccess === false");
    expect(trpc.indexOf("authenticatedProcedure")).toBeLessThan(trpc.indexOf("protectedProcedure = t.procedure.use(requireCmsAccess)"));
  });

  it("aceite de Opportunity e Production própria não usam o gate de CMS", () => {
    const opportunities = source("server/routers/opportunities.ts");
    const productions = source("server/routers/productions.ts");
    expect(opportunities).toContain("accept: authenticatedProcedure");
    expect(opportunities).toContain("decline: authenticatedProcedure");
    expect(opportunities).toContain("create: protectedProcedure");
    expect(productions).toContain("mine: authenticatedProcedure");
    expect(productions).toContain("createFromOpportunity: authenticatedProcedure");
    expect(productions).toContain("uploadId: z.string().min(12).max(96)");
    expect(productions).not.toContain("uploadId: z.string().min(12).max(96).optional()");
    expect(productions).toContain("list: protectedProcedure");
    expect(productions).toContain("approveReview: protectedProcedure");
  });

  it("ledger de Termos de Uso é versionado e não é gov.br", () => {
    const schema = source("drizzle/schema.ts");
    const terms = source("server/termsOfUse.ts");
    expect(schema).toContain("termsOfUseAcceptances");
    expect(schema).toContain('consentEvidenceKinds = ["staff_attestation", "subject_signature"]');
    expect(terms).toContain("TERMS_OF_USE_VERSION");
    expect(source("shared/legalVersions.ts")).toContain(TERMS_OF_USE_VERSION);
    expect(terms).toContain("Não é assinatura digital gov.br");
    expect(terms).toContain('actor.role === "administrador principal"');
    expect(source("server/routers/joinRequests.ts")).toContain("termsDocumentVersion: z.literal(TERMS_OF_USE_VERSION)");
  });

  it("OJU-AR continua documento formal de CMS e OJU-AE permanece no comercial", () => {
    const collaborators = source("server/routers/collaborators.ts");
    const commercial = source("server/routers/commercial.ts");
    expect(collaborators).toContain("cmsAccessRequiresResponsibilityTerm: true");
    expect(collaborators).toContain('grant.role !== "administrador" || Boolean(signedTerm)');
    expect(commercial).toContain("Anexe o termo assinado via gov.br antes de ativar a autorização editorial.");
  });
});
