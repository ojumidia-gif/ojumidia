import { expect, test } from "@playwright/test";
import { hasPersonaState, personaStatePath } from "./personas";
import {
  MISSING_PERSONA,
  STALE_PROFESSIONAL_SESSION,
  attachReadOnlyGuards,
  assertReadOnlyWatch,
  denied,
  findPublicProfessionalSlug,
  readAuthMe,
  trpcErrorCode,
  trpcQuery,
  unwrapTrpcData,
  waitUntilSettled,
} from "./support";

const skipSuper = !hasPersonaState("superAdmin");
const skipProfessional = !hasPersonaState("professional");
const skipTerritorial = !hasPersonaState("territorialAdmin");
const skipProfessionalNoTerritory = !hasPersonaState("professionalNoTerritory");

test.describe("Matriz negativa — anônimo", () => {
  test("anonymous → APIs admin/protegidas → DENIED", async ({ request }) => {
    const procedures = [
      "productions.list",
      "networkDirectory.adminProfiles",
      "portalContent.adminList",
      "partners.list",
      "partners.myContext",
      "editorial.adminList",
      "operations.overview",
      "operations.auditLog",
      "governance.alerts",
      "collaborators.list",
      "commercial.myOriginationLeads",
    ];
    for (const procedure of procedures) {
      const { status, body } = await trpcQuery(request, procedure);
      expect(status, `${procedure} HTTP ${status}`).toBeLessThan(500);
      const code = trpcErrorCode(body);
      expect(status === 401 || code === "UNAUTHORIZED", `${procedure} anônimo deve ser UNAUTHORIZED; HTTP ${status} code=${code}`).toBeTruthy();
    }
  });
});

test.describe("Super Admin — sessão real de leitura", () => {
  test.use({ storageState: skipSuper ? { cookies: [], origins: [] } : personaStatePath("superAdmin") });

  test("login real, auth.me e papel de Super Admin", async ({ request }) => {
    test.skip(skipSuper, MISSING_PERSONA);
    const { user, status } = await readAuthMe(request);
    expect(status).toBe(200);
    expect(user).toBeTruthy();
    expect(user!.role).toBe("administrador principal");
    expect(user!.adminAccess).toBeTruthy();
    expect(user!.accountStatus === undefined || user!.accountStatus === "Ativo").toBeTruthy();
  });

  test("/admin dashboard nacional carrega sem mutation", async ({ page }) => {
    test.skip(skipSuper, MISSING_PERSONA);
    const watch = attachReadOnlyGuards(page);
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Painel nacional")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Parceiros Ojú", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Centro Administrativo Ojú" })).toHaveCount(0);
    await assertReadOnlyWatch(watch);
  });

  test("APIs administrativas de leitura autorizam o Super Admin", async ({ request }) => {
    test.skip(skipSuper, MISSING_PERSONA);
    const reads = [
      { procedure: "partners.myContext", input: undefined as unknown },
      { procedure: "partners.list" },
      { procedure: "portalContent.adminList" },
      { procedure: "networkDirectory.adminProfiles" },
      { procedure: "editorial.adminList", input: { limit: 5, offset: 0 } },
      { procedure: "productions.list" },
      { procedure: "operations.overview", input: { limit: 10 } },
      { procedure: "operations.auditLog", input: { limit: 5, offset: 0, view: "operacao" } },
      { procedure: "governance.alerts" },
      { procedure: "collaborators.list" },
      { procedure: "commercial.access" },
    ];
    for (const item of reads) {
      const { status, body } = await trpcQuery(request, item.procedure, item.input);
      expect(status, `${item.procedure} HTTP ${status}`).toBeLessThan(500);
      expect(trpcErrorCode(body), `${item.procedure} não deveria ser recusado`).toBeUndefined();
    }
    const context = unwrapTrpcData((await trpcQuery(request, "partners.myContext")).body) as { scope?: string };
    expect(context?.scope).toBe("global");
  });
});

test.describe("Profissional da Rede — sessão real de leitura", () => {
  test.use({ storageState: skipProfessional ? { cookies: [], origins: [] } : personaStatePath("professional") });

  test("auth.me: sessão válida e adminAccess false", async ({ request }) => {
    test.skip(skipProfessional, MISSING_PERSONA);
    const { user } = await readAuthMe(request);
    test.skip(!user, STALE_PROFESSIONAL_SESSION);
    expect(user!.adminAccess).toBe(false);
    expect(user!.role).not.toBe("administrador principal");
    const mine = await trpcQuery(request, "commercial.myOriginationLeads");
    expect(mine.status).toBeLessThan(500);
    expect(trpcErrorCode(mine.body)).toBeUndefined();
    const mineOpp = await trpcQuery(request, "opportunities.mine");
    expect(mineOpp.status).toBeLessThan(500);
    expect(trpcErrorCode(mineOpp.body)).toBeUndefined();
  });

  test("páginas da Rede e originação abrem sem enviar lead", async ({ page, request }) => {
    test.skip(skipProfessional, MISSING_PERSONA);
    const { user } = await readAuthMe(request);
    test.skip(!user, STALE_PROFESSIONAL_SESSION);
    const watch = attachReadOnlyGuards(page);
    await page.goto("/rede", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Conheça a Rede Ojú." })).toBeVisible();
    await waitUntilSettled(page, ["Organizando a Rede…"]);

    await page.goto("/rede/profissionais", { waitUntil: "domcontentloaded" });
    await waitUntilSettled(page, ["Organizando a Rede…"]);

    const slug = await findPublicProfessionalSlug(request);
    if (slug) {
      await page.goto(`/rede/profissionais/${slug}`, { waitUntil: "domcontentloaded" });
      await waitUntilSettled(page, ["Carregando presença na Rede…"]);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }

    await page.goto("/rede/originar", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Originar uma demanda" })).toBeVisible();
    await expect(page.getByText("Carregando sessão…")).toHaveCount(0);
    const send = page.getByRole("button", { name: "Enviar para análise da Rede" });
    const noProfile = page.getByText("Não há perfil profissional Ativo nesta conta");
    await expect(send.or(noProfile)).toBeVisible();
    await assertReadOnlyWatch(watch);
  });

  test("profissional → /admin recusado na UI e no backend", async ({ page, request }) => {
    test.skip(skipProfessional, MISSING_PERSONA);
    const { user } = await readAuthMe(request);
    test.skip(!user, STALE_PROFESSIONAL_SESSION);
    const watch = attachReadOnlyGuards(page);
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Acesso não autorizado" })).toBeVisible();
    await expect(page.getByText("Painel nacional")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Parceiros Ojú" })).toHaveCount(0);

    for (const procedure of ["networkDirectory.adminProfiles", "portalContent.adminList", "partners.list", "editorial.adminList", "operations.auditLog", "governance.alerts", "collaborators.list"]) {
      const { status, body } = await trpcQuery(request, procedure);
      expect(status).toBeLessThan(500);
      const code = trpcErrorCode(body);
      expect(status === 401 || code === "UNAUTHORIZED", `${procedure} profissional adminAccess=false deve ser UNAUTHORIZED; HTTP ${status} code=${code}`).toBeTruthy();
    }
    await assertReadOnlyWatch(watch);
  });
});

test.describe("Administrador territorial — sessão real de leitura", () => {
  test.use({ storageState: skipTerritorial ? { cookies: [], origins: [] } : personaStatePath("territorialAdmin") });

  test("auth.me e escopo de parceiro/território real", async ({ request }) => {
    test.skip(skipTerritorial, MISSING_PERSONA);
    const { user } = await readAuthMe(request);
    expect(user).toBeTruthy();
    expect(user!.adminAccess).toBeTruthy();
    expect(user!.role).not.toBe("administrador principal");
    const context = unwrapTrpcData((await trpcQuery(request, "partners.myContext")).body) as {
      scope?: string;
      partners?: Array<{ territories?: Array<{ id: number; name: string }> }>;
    };
    expect(context?.scope).toBe("partner");
    expect(context?.partners?.[0]?.territories?.length).toBeGreaterThan(0);
  });

  test("território próprio: leituras administrativas autorizadas", async ({ page, request }) => {
    test.skip(skipTerritorial, MISSING_PERSONA);
    const watch = attachReadOnlyGuards(page);
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Painel da cidade")).toBeVisible();
    await expect(page.getByRole("link", { name: "Parceiros Ojú" })).toHaveCount(0);

    const { status, body } = await trpcQuery(request, "editorial.adminList", { limit: 5, offset: 0 });
    expect(status).toBeLessThan(500);
    expect(trpcErrorCode(body)).toBeUndefined();
    const { status: overviewStatus, body: overviewBody } = await trpcQuery(request, "operations.overview", { limit: 10 });
    expect(overviewStatus).toBeLessThan(500);
    expect(trpcErrorCode(overviewBody)).toBeUndefined();
    const overview = unwrapTrpcData(overviewBody) as { scope?: string };
    expect(overview?.scope).toBe("territorial");
    await assertReadOnlyWatch(watch);
  });

  test("território externo / consolidado nacional: backend recusa", async ({ request }) => {
    test.skip(skipTerritorial, MISSING_PERSONA);
    const partnersList = await trpcQuery(request, "partners.list");
    expect(partnersList.status).toBeLessThan(500);
    expect(trpcErrorCode(partnersList.body), "partners.list é exclusivo do Super Admin").toBe("FORBIDDEN");

    const audit = await trpcQuery(request, "operations.auditLog", { limit: 5, offset: 0, view: "operacao" });
    expect(audit.status, "auditLog territorial não pode ser HTTP 500").toBeLessThan(500);
    expect(trpcErrorCode(audit.body), "auditLog territorial deve ser FORBIDDEN").toBe("FORBIDDEN");

    const alerts = await trpcQuery(request, "governance.alerts");
    expect(alerts.status).toBeLessThan(500);
    expect(trpcErrorCode(alerts.body)).toBe("FORBIDDEN");

    const collaborators = await trpcQuery(request, "collaborators.list");
    expect(collaborators.status).toBeLessThan(500);
    expect(trpcErrorCode(collaborators.body)).toBe("FORBIDDEN");
  });
});

test.describe("Super Admin × admin territorial — isolamento", () => {
  test("preview de publicação fora do escopo é FORBIDDEN", async ({ browser }) => {
    test.skip(skipSuper || skipTerritorial, MISSING_PERSONA);
    const superContext = await browser.newContext({ storageState: personaStatePath("superAdmin") });
    const territorialContext = await browser.newContext({ storageState: personaStatePath("territorialAdmin") });
    const superRequest = superContext.request;
    const territorialRequest = territorialContext.request;

    const own = unwrapTrpcData((await trpcQuery(territorialRequest, "partners.myContext")).body) as {
      partners?: Array<{ partnerId?: number; territories?: Array<{ id: number }> }>;
    };
    const ownPartnerIds = new Set((own?.partners || []).map(item => item.partnerId).filter(Boolean));
    const ownTerritoryIds = new Set((own?.partners || []).flatMap(item => item.territories || []).map(item => item.id));

    const national = unwrapTrpcData((await trpcQuery(superRequest, "editorial.adminList", { limit: 40, offset: 0 })).body) as {
      items?: Array<{ id: number; partnerId?: number | null; createdBy?: number | null }>;
    };
    const foreign = (national?.items || []).find(item => {
      if (item.partnerId && !ownPartnerIds.has(item.partnerId)) return true;
      return false;
    });

    if (!foreign) {
      test.info().annotations.push({
        type: "blocked",
        description: "BLOQUEADO — requer publicação real de outro território para provar 403; nenhum dado foi criado.",
      });
      await superContext.close();
      await territorialContext.close();
      test.skip(true, "BLOQUEADO — requer ambiente/dados isolados: não há publicação persistida de outro território.");
      return;
    }

    const preview = await trpcQuery(territorialRequest, "editorial.preview", { id: foreign.id });
    expect(preview.status).toBeLessThan(500);
    expect(trpcErrorCode(preview.body) === "FORBIDDEN" || denied(preview.status, preview.body)).toBeTruthy();

    const allowed = await trpcQuery(superRequest, "editorial.preview", { id: foreign.id });
    expect(trpcErrorCode(allowed.body)).toBeUndefined();
    void ownTerritoryIds;
    await superContext.close();
    await territorialContext.close();
  });
});

test.describe("Profissional sem território — sessão real, sem originação", () => {
  test.use({ storageState: skipProfessionalNoTerritory ? { cookies: [], origins: [] } : personaStatePath("professionalNoTerritory") });

  test("auth.me, perfil da Rede e originação sem enviar lead", async ({ page, request }) => {
    test.skip(skipProfessionalNoTerritory, MISSING_PERSONA);
    const { user } = await readAuthMe(request);
    expect(user).toBeTruthy();
    expect(user!.adminAccess).toBe(false);

    const mine = await trpcQuery(request, "commercial.myOriginationLeads");
    expect(mine.status).toBeLessThan(500);
    expect(trpcErrorCode(mine.body)).toBeUndefined();

    await page.goto("/rede/originar", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Originar uma demanda" })).toBeVisible();
    test.info().annotations.push({
      type: "deferred",
      description: "E2E-03 não envia commercial.originateLead: a recusa sem território (FORBIDDEN) fica para a fase de fluxo comercial, para não persistir lead.",
    });
  });
});
