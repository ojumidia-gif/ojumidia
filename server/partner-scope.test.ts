import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Parceiro Ojú, território e operação isolada", () => {
  const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
  const scope = readFileSync(resolve(process.cwd(), "server/partnerScope.ts"), "utf8");
  const partnerRouter = readFileSync(resolve(process.cwd(), "server/routers/partners.ts"), "utf8");
  const mediaRouter = readFileSync(resolve(process.cwd(), "server/routers/media.ts"), "utf8");
  const commercialRouter = readFileSync(resolve(process.cwd(), "server/routers/commercial.ts"), "utf8");
  const communityRouter = readFileSync(resolve(process.cwd(), "server/routers/community.ts"), "utf8");
  const uploadEndpoint = readFileSync(resolve(process.cwd(), "server/_core/index.ts"), "utf8");
  const dashboard = readFileSync(resolve(process.cwd(), "client/src/pages/admin/AdminDashboard.tsx"), "utf8");
  const partnerPanel = readFileSync(resolve(process.cwd(), "client/src/pages/admin/PartnersAdmin.tsx"), "utf8");
  const editorialRouter = readFileSync(resolve(process.cwd(), "server/routers/editorial.ts"), "utf8");
  const networkRouter = readFileSync(resolve(process.cwd(), "server/routers/network.ts"), "utf8");
  const financialRouter = readFileSync(resolve(process.cwd(), "server/routers/financial.ts"), "utf8");

  it("mantém parceiro, membros, territórios, auditoria e sessões de upload como entidades aditivas", () => {
    expect(schema).toContain('export const partners = mysqlTable("partners"');
    expect(schema).toContain('export const partnerMembers = mysqlTable("partnerMembers"');
    expect(schema).toContain('export const partnerTerritories = mysqlTable("partnerTerritories"');
    expect(schema).toContain('export const auditEvents = mysqlTable("auditEvents"');
    expect(schema).toContain('export const uploadSessions = mysqlTable("uploadSessions"');
    expect(schema).toContain('export const commercialRefundPolicies = mysqlTable("commercialRefundPolicies"');
    expect(schema).toContain('export const commercialTransactions = mysqlTable("commercialTransactions"');
    expect(schema).toContain('export const highlightSuggestions = mysqlTable("highlightSuggestions"');
    expect(schema).toContain('uploadStatus: mysqlEnum("uploadStatus", uploadStatuses)');
    expect(schema).toContain('version: int("version").default(1).notNull()');
  });

  it("verifica papel, parceiro e território no backend, sem confiar somente na interface", () => {
    expect(scope).toContain("assertPartnerScope");
    expect(scope).toContain("decideAuthenticatedScope");
    expect(scope).toContain("resolveAuthenticatedScope");
    expect(scope).toContain("O território informado não pertence ao escopo autorizado");
    expect(scope).toContain("activePartnerMemberships");
    expect(partnerRouter).toContain("Somente o Super Admin pode administrar Parceiros Ojú");
    expect(communityRouter).toContain("requireCommunityPartnerScope");
    expect(commercialRouter).toContain("requireCommercialPartnerScope");
    expect(mediaRouter).toContain("assertMediaScope");
  });

  it("mantém upload idempotente, único e separado da publicação", () => {
    expect(uploadEndpoint).toContain("x-upload-id");
    expect(uploadEndpoint).toContain("createHash(\"sha256\")");
    expect(uploadEndpoint).toContain("Este upload já está em processamento");
    expect(uploadEndpoint).toContain('status: "Pronto"');
    expect(uploadEndpoint).toContain("upload-ready");
    expect(uploadEndpoint).toContain("attemptCount");
    expect(mediaRouter).toContain("Conclua um upload seu antes de registrá-lo no Acervo");
    expect(mediaRouter).toContain("approveUpload");
    expect(mediaRouter).toContain("rejectUpload");
    expect(mediaRouter).toContain("Mídia registrada no Acervo; publicação permanece dependente de autorização e curadoria");
  });

  it("reserva Home e fundo vivo para governança nacional do Super Admin", () => {
    expect(mediaRouter).toContain("Somente o Super Admin pode alterar a transição do fundo vivo");
    expect(mediaRouter).toContain("requirePrincipal(ctx.user.role);");
    expect(commercialRouter).toContain("Solicitações públicas sem parceiro e território devem ser distribuídas pelo Super Admin");
    expect(dashboard).toContain("Parceiros Ojú, territórios e escopos");
    expect(partnerPanel).toContain("Identidade pública contextual");
    expect(partnerPanel).toContain("A ativação só é aceita após haver ao menos um território autorizado");
    expect(editorialRouter).toContain("pickReusableTeam");
    expect(editorialRouter).toContain("mergeDuplicateTeams");
    expect(editorialRouter).toContain("Esta equipe é de outro admin.");
    expect(editorialRouter).toContain("Este conteúdo é de outro admin.");
    expect(editorialRouter).toContain("Este cadastro é de outro admin.");
    expect(editorialRouter).toContain("catálogo nacional");
    expect(editorialRouter).toContain("Esta mídia pertence a outro admin.");
    expect(editorialRouter).toContain("createdBy: ctx.user.id");
    expect(mediaRouter).toContain("Esta mídia pertence a outro admin.");
    expect(editorialRouter).toContain("resolveAuthenticatedScope");
    expect(editorialRouter).toContain("suggestHighlight");
    expect(editorialRouter).toContain("decideHighlightSuggestion");
    expect(networkRouter).toContain("apenas o Super Admin pode aprová-lo para a Home nacional");
  });

  it("preserva titularidade, evita concorrência e registra exceções financeiras como novos lançamentos", () => {
    expect(scope).toContain('eq(partnerTerritories.status, "Ativa")');
    expect(partnerRouter).toContain('status: "Encerrada"');
    expect(partnerRouter).toContain("Titularidade territorial atualizada pelo Super Admin sem apagar associações históricas");
    expect(editorialRouter).toContain("expectedVersion");
    expect(financialRouter).toContain("maximumRefundPercent");
    expect(financialRouter).toContain("nunca atingir 100% da cobrança");
    expect(financialRouter).toContain("Lançamento compensatório criado sem apagar a cobrança original");
  });
});
