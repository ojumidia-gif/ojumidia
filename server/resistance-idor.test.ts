import { describe, expect, it } from "vitest";
import { decideOpportunityProductionAccess, decideProductionMediaAttachAccess } from "./productions";
import { toPublicPortalMedia } from "./mediaAccess";
import { toPublicPortalBlocks } from "./routers/portalContent";

describe("resistência: IDOR de Production a partir do F12", () => {
  const accepted = {
    acceptedUserId: 40,
    acceptedProfessionalProfileId: 7,
    actorProfessionalProfileId: 7,
  };

  it("profissional autenticado de outro território não abre produção alheia só com o opportunityId", () => {
    expect(decideOpportunityProductionAccess({
      actor: { id: 99, role: "criador" },
      acceptedUserId: 40,
      acceptedProfessionalProfileId: 7,
      actorProfessionalProfileId: 8,
    })).toBe("deny");
  });

  it("profissional que aceitou a oportunidade continua podendo abrir a produção", () => {
    expect(decideOpportunityProductionAccess({
      actor: { id: 40, role: "criador" },
      ...accepted,
    })).toBe("allow");
  });

  it("admin territorial precisa do escopo de parceiro; Super Admin passa", () => {
    expect(decideOpportunityProductionAccess({
      actor: { id: 3, role: "administrador" },
      acceptedUserId: 40,
      acceptedProfessionalProfileId: 7,
      actorProfessionalProfileId: null,
    })).toBe("partner-admin");
    expect(decideOpportunityProductionAccess({
      actor: { id: 1, role: "administrador principal" },
      acceptedUserId: 40,
      acceptedProfessionalProfileId: 7,
      actorProfessionalProfileId: null,
    })).toBe("allow");
  });

  it("especialidade/fotógrafo não concede attach de mídia de outro autor", () => {
    expect(decideProductionMediaAttachAccess({
      actorRole: "criador",
      actorId: 40,
      mediaCreatedBy: 88,
      mediaPartnerId: null,
      productionPartnerId: 10,
    })).toBe("deny");
    expect(decideProductionMediaAttachAccess({
      actorRole: "criador",
      actorId: 40,
      mediaCreatedBy: 40,
      mediaPartnerId: 10,
      productionPartnerId: 10,
    })).toBe("allow");
  });

  it("admin de outro parceiro não liga mídia de SP em produção do RS", () => {
    expect(decideProductionMediaAttachAccess({
      actorRole: "administrador",
      actorId: 3,
      mediaCreatedBy: 88,
      mediaPartnerId: 20,
      productionPartnerId: 10,
    })).toBe("deny");
  });
});

describe("resistência: serializer público não entrega o que o React esconde", () => {
  it("bloco institucional oculto chega sem contentJson", () => {
    const publicBlocks = toPublicPortalBlocks([
      { id: 1, sectionKey: "hero", contentJson: "{\"title\":\"rascunho interno\"}", isVisible: false, deletedAt: null, displayOrder: 0 },
      { id: 2, sectionKey: "planning", contentJson: "{\"title\":\"público\"}", isVisible: true, deletedAt: null, displayOrder: 1 },
      { id: 3, sectionKey: "gone", contentJson: "{\"secret\":true}", isVisible: true, deletedAt: new Date(), displayOrder: 2 },
    ]);
    expect(publicBlocks).toHaveLength(2);
    expect(publicBlocks.find(item => item.sectionKey === "hero")?.contentJson).toBeNull();
    expect(publicBlocks.find(item => item.sectionKey === "planning")?.contentJson).toContain("público");
    expect(JSON.stringify(publicBlocks)).not.toContain("rascunho interno");
    expect(JSON.stringify(publicBlocks)).not.toContain("secret");
  });

  it("mídia pública não carrega storageKey, checksum, createdBy nem partnerId", () => {
    const payload = toPublicPortalMedia({
      id: 12,
      mediaType: "vídeo",
      assetUrl: "/media-storage/public.mp4",
      credit: "Rede Ojú",
      origin: "Home",
      filename: "clip.mp4",
      durationSeconds: 12,
      photographerId: 4,
      storageKey: "private/path/secret.mp4",
      checksum: "abc",
      createdBy: 9,
      partnerId: 77,
      uploadId: "upload-secret",
      terms: "interno",
    } as Parameters<typeof toPublicPortalMedia>[0] & Record<string, unknown>);
    const serialized = JSON.stringify(payload);
    expect(payload.assetUrl).toBe("/media-storage/public.mp4");
    expect(serialized).not.toContain("storageKey");
    expect(serialized).not.toContain("private/path");
    expect(serialized).not.toContain("checksum");
    expect(serialized).not.toContain("createdBy");
    expect(serialized).not.toContain("uploadId");
    expect(serialized).not.toContain("partnerId");
  });
});
