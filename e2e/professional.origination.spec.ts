import { expect, test } from "./fixtures/cleanup";
import { registerOriginationCleanup } from "./lib/originationCleanup";
import { qaMutationReadiness } from "./lib/qaReadiness";
import { hasPersonaState, personaStatePath } from "./personas";
import {
  denied,
  findPublicProfessionalSlug,
  readAuthMe,
  trpcErrorCode,
  trpcMutation,
  trpcQuery,
  unwrapTrpcData,
  waitUntilSettled,
} from "./support";

const readiness = qaMutationReadiness();
const skipPersona = !hasPersonaState("professional");
const marker = `QA-AUTO originação ${Date.now()}`;

test.describe("Profissional — originação real", () => {
  test.use({
    storageState: skipPersona ? { cookies: [], origins: [] } : personaStatePath("professional"),
  });

  test("LOGIN → Rede → originar → persistir → não cria Opportunity → cleanup", async ({ page, request, ledger }) => {
    test.skip(
      !readiness.guard.allowed,
      `BLOCKED: ambiente mutante inseguro. ${readiness.guard.allowed ? "" : readiness.guard.reason} databaseKind=${readiness.databaseKind}.`,
    );
    test.skip(skipPersona, "BLOCKED: storageState profissional ausente. Capture OAuth real de conta QA em e2e/.auth/professional.json.");

    registerOriginationCleanup(ledger);

    const me = await readAuthMe(request);
    expect(me.user).toBeTruthy();
    expect(me.user!.adminAccess).toBe(false);
    expect(me.user!.role).not.toBe("administrador principal");

    await page.goto("/rede", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Conheça a Rede Ojú." })).toBeVisible();
    await waitUntilSettled(page, ["Organizando a Rede…"]);

    await page.goto("/rede/profissionais", { waitUntil: "domcontentloaded" });
    await waitUntilSettled(page, ["Organizando a Rede…"]);
    const slug = await findPublicProfessionalSlug(request);
    if (slug) {
      await page.goto(`/rede/profissionais/${slug}`, { waitUntil: "domcontentloaded" });
      await waitUntilSettled(page, ["Carregando presença na Rede…"]);
    }

    await page.goto("/rede/originar", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Originar uma demanda" })).toBeVisible();
    await expect(page.getByText("Carregando sessão…")).toHaveCount(0);

    const mineBefore = await trpcQuery(request, "commercial.myOriginationLeads");
    expect(mineBefore.status).toBe(200);
    const before = unwrapTrpcData(mineBefore.body) as {
      profile?: { id: number; territoryId: number | null; userId?: number | null } | null;
      items?: Array<{ id: number }>;
    };
    expect(before.profile, "perfil profissional Ativo obrigatório para o piloto").toBeTruthy();
    expect(before.profile!.territoryId, "território do perfil obrigatório").toBeTruthy();
    const idsBefore = new Set((before.items || []).map(item => item.id));

    const created = await trpcMutation(request, "commercial.originateLead", {
      clientName: marker,
      contact: "qa-auto@example.invalid",
      title: marker,
      briefing: "Demanda de QA-AUTO para prova de persistência e cleanup. Sem preço.",
      workType: "Fotografia",
      eventDate: null,
      durationText: null,
    });
    expect(created.status, `originateLead HTTP ${created.status} ${JSON.stringify(created.body)}`).toBeLessThan(400);
    expect(trpcErrorCode(created.body)).toBeUndefined();
    const payload = unwrapTrpcData(created.body) as {
      id?: number;
      originatedByProfessionalProfileId?: number;
      createdByUserId?: number;
      opportunityCreated?: boolean;
    };
    expect(payload.id).toBeTruthy();
    ledger.add("commercialRequest", payload.id!);
    expect(payload.opportunityCreated).toBe(false);
    expect(payload.originatedByProfessionalProfileId).toBe(before.profile!.id);
    expect(payload.createdByUserId).toBe(me.user!.id);
    expect(payload.createdByUserId).not.toBe(payload.originatedByProfessionalProfileId);

    const mineAfter = await trpcQuery(request, "commercial.myOriginationLeads");
    const after = unwrapTrpcData(mineAfter.body) as {
      items?: Array<{
        id: number;
        eventType: string;
        originKind: string;
        originatedByProfessionalProfileId: number | null;
        createdByUserId: number | null;
        territoryId: number | null;
        managedByUserId: number | null;
      }>;
    };
    const row = (after.items || []).find(item => item.id === payload.id);
    expect(row, "lead deve aparecer em myOriginationLeads").toBeTruthy();
    expect(idsBefore.has(payload.id!)).toBe(false);
    expect(row!.eventType).toBe(marker);
    expect(row!.originKind).toBe("profissional");
    expect(row!.originatedByProfessionalProfileId).toBe(before.profile!.id);
    expect(row!.createdByUserId).toBe(me.user!.id);
    expect(row!.territoryId).toBe(before.profile!.territoryId);
    expect(row!.managedByUserId).toBeNull();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(marker)).toBeVisible();

    const forbiddenOpportunity = await trpcQuery(request, "opportunities.list", undefined, { intent: "auth-probe" });
    expect(denied(forbiddenOpportunity.status, forbiddenOpportunity.body), "profissional não lista opportunities como leitura segura").toBeTruthy();

    const adminUi = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    expect(adminUi?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Acesso não autorizado" })).toBeVisible();
  });
});
