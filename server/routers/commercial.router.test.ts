import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn());
vi.mock("../db", () => ({ getDb: getDbMock }));

import { commercialRouter } from "./commercial";

const ad = {
  id: 22, advertiserName: "Contratante real", title: "Divulgação", description: null, contact: "contato", services: null, format: "Cartão de serviço", mediaUrl: null, mediaType: null, startsAt: new Date("2026-08-01"), endsAt: new Date("2026-09-01"), renewalAt: null, status: "Ativo", capturedByUserId: 20, contractedAmount: "100.00", ojuSharePercent: "60.00", captorSharePercent: "40.00", payoutStatus: "Pendente", createdBy: 20, sourcePublicationId: null, createdAt: new Date(), updatedAt: new Date(),
} as const;

const context = (id: number, role: "administrador" | "administrador principal") => ({ user: { id, role, openId: String(id), name: "Equipe", email: "equipe@oju.test", loginMethod: "test" } }) as any;
const listDb = (allRows: typeof ad[], ownedRows: typeof ad[]) => { const where = vi.fn(() => ({ orderBy: vi.fn(async () => ownedRows), limit: vi.fn(async () => ownedRows) })); return { db: { select: vi.fn(() => ({ from: vi.fn(() => ({ orderBy: vi.fn(async () => allRows), where })) })) }, where }; };

describe("procedures comerciais por papel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("entrega o consolidado ao principal e filtra anúncios de outro captador para administrador comum", async () => {
    const principalDb = listDb([ad], []);
    getDbMock.mockResolvedValueOnce(principalDb.db);
    const consolidated = await commercialRouter.createCaller(context(1, "administrador principal")).listAds();
    expect(consolidated[0].capturedByUserId).toBe(20);
    expect(principalDb.where).not.toHaveBeenCalled();
    const nonOwnerDb = listDb([ad], []);
    getDbMock.mockResolvedValueOnce(nonOwnerDb.db);
    const own = await commercialRouter.createCaller(context(10, "administrador")).listAds();
    expect(own).toHaveLength(0);
    expect(nonOwnerDb.where).toHaveBeenCalledOnce();
  });

  it("bloqueia updateAd de administrador que não é o captador", async () => {
    const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [ad]) })) })) })), update: vi.fn() };
    getDbMock.mockResolvedValueOnce(db);
    await expect(commercialRouter.createCaller(context(10, "administrador")).updateAd({ id: ad.id, advertiserName: ad.advertiserName, title: ad.title, contact: ad.contact, format: ad.format, startsAt: ad.startsAt, endsAt: ad.endsAt, capturedByUserId: ad.capturedByUserId, contractedAmount: 100, ojuSharePercent: 60, captorSharePercent: 40, status: ad.status })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("permite updateAd para o administrador proprietário", async () => {
    const where = vi.fn(async () => ({ success: true })); const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [ad]) })) })) })), update: vi.fn(() => ({ set: vi.fn(() => ({ where })) })) };
    getDbMock.mockResolvedValueOnce(db);
    await expect(commercialRouter.createCaller(context(20, "administrador")).updateAd({ id: ad.id, advertiserName: ad.advertiserName, title: ad.title, contact: ad.contact, format: ad.format, startsAt: ad.startsAt, endsAt: ad.endsAt, capturedByUserId: ad.capturedByUserId, contractedAmount: 100, ojuSharePercent: 60, captorSharePercent: 40, status: ad.status })).resolves.toEqual({ success: true });
    expect(db.update).toHaveBeenCalledOnce();
  });

  it("bloqueia updatePayout de administrador comum e permite ao principal", async () => {
    await expect(commercialRouter.createCaller(context(20, "administrador")).updatePayout({ id: 22, payoutStatus: "Pago" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const where = vi.fn(async () => ({ success: true })); const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [ad]) })) })) })), update: vi.fn(() => ({ set: vi.fn(() => ({ where })) })), insert: vi.fn(() => ({ values: vi.fn(async () => ({ success: true })) })) };
    getDbMock.mockResolvedValueOnce(db);
    await expect(commercialRouter.createCaller(context(1, "administrador principal")).updatePayout({ id: 22, payoutStatus: "Pago" })).resolves.toEqual({ success: true });
    expect(db.update).toHaveBeenCalledOnce();
    expect(db.insert).toHaveBeenCalledOnce();
  });
});
