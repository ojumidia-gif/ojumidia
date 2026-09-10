import { describe, expect, it } from "vitest";
import {
  completeProductionLabel,
  parseStoredExternalHttpUrl,
  parseStoredExternalLabel,
  sanitizeExternalHttpUrl,
  toPublicCompleteProductions,
} from "./externalPublicationLink";

describe("URL externa editorial", () => {
  it("aceita HTTPS válido e normaliza", () => {
    expect(sanitizeExternalHttpUrl("https://fotografa.example/album")).toBe("https://fotografa.example/album");
  });

  it("aceita HTTP", () => {
    expect(sanitizeExternalHttpUrl("http://veiculo.example/materia")).toBe("http://veiculo.example/materia");
  });

  it("rejeita javascript:, data:, HTML e esquemas perigosos", () => {
    expect(sanitizeExternalHttpUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeExternalHttpUrl("data:text/html,<script>x</script>")).toBeNull();
    expect(sanitizeExternalHttpUrl("vbscript:msg")).toBeNull();
    expect(sanitizeExternalHttpUrl("https://example.com/<script>")).toBeNull();
    expect(sanitizeExternalHttpUrl('https://example.com/"onclick')).toBeNull();
  });

  it("trata vazio como ausência e inválido como falha de persistência", () => {
    expect(parseStoredExternalHttpUrl(null)).toEqual({ ok: true, value: null });
    expect(parseStoredExternalHttpUrl("   ")).toEqual({ ok: true, value: null });
    expect(parseStoredExternalHttpUrl("javascript:alert(1)")).toEqual({ ok: false });
    expect(parseStoredExternalHttpUrl("https://ok.example/a")).toEqual({ ok: true, value: "https://ok.example/a" });
  });
});

describe("label do botão de produção completa", () => {
  it("aceita texto simples e normaliza espaços e seta final", () => {
    expect(parseStoredExternalLabel("  Acessar registro completo →  ")).toEqual({ ok: true, value: "Acessar registro completo" });
  });

  it("trata vazio e whitespace como fallback (null)", () => {
    expect(parseStoredExternalLabel(null)).toEqual({ ok: true, value: null });
    expect(parseStoredExternalLabel("   ")).toEqual({ ok: true, value: null });
  });

  it("rejeita HTML, script, event handler e URL embutida", () => {
    expect(parseStoredExternalLabel("<b>álbum</s>")).toEqual({ ok: false });
    expect(parseStoredExternalLabel('<a onclick="alert(1)">clique</a>')).toEqual({ ok: false });
    expect(parseStoredExternalLabel("javascript:alert(1)")).toEqual({ ok: false });
    expect(parseStoredExternalLabel("Veja https://drive.google.com/x")).toEqual({ ok: false });
  });

  it("deriva o texto padrão por tipo editorial", () => {
    expect(completeProductionLabel("História", "album")).toBe("Ver história completa");
    expect(completeProductionLabel("Cobertura", "album")).toBe("Ver álbum completo");
    expect(completeProductionLabel("Documentário", "album")).toBe("Ver documentário completo");
    expect(completeProductionLabel("Projeto", "album")).toBe("Ver projeto completo");
    expect(completeProductionLabel("Fotografia documental", "album")).toBe("Ver produção completa");
  });

  it("usa label personalizado quando válido e fallback quando vazio", () => {
    const url = "https://album.example/completo";
    expect(toPublicCompleteProductions({
      contentKind: "Cobertura",
      externalAlbumUrl: url,
      externalAlbumLabel: "Acessar registro completo",
    })).toEqual([{ url, label: "Acessar registro completo" }]);
    expect(toPublicCompleteProductions({
      contentKind: "Cobertura",
      externalAlbumUrl: url,
      externalAlbumLabel: "   ",
    })).toEqual([{ url, label: "Ver álbum completo" }]);
    expect(toPublicCompleteProductions({
      contentKind: "História",
      externalAlbumUrl: url,
      externalAlbumLabel: "<script>x</script>",
    })).toEqual([{ url, label: "Ver história completa" }]);
  });

  it("não devolve links quando não há URL sanitizada", () => {
    expect(toPublicCompleteProductions({ contentKind: "Cobertura", externalAlbumLabel: "Ver álbum completo" })).toEqual([]);
    expect(toPublicCompleteProductions({ contentKind: "Cobertura", externalAlbumUrl: "javascript:alert(1)", externalAlbumLabel: "Ver álbum" })).toEqual([]);
  });

  it("não duplica quando álbum e vídeo apontam para o mesmo endereço", () => {
    const url = "https://mesmo.example/producao";
    expect(toPublicCompleteProductions({ contentKind: "Documentário", externalAlbumUrl: url, externalVideoUrl: url })).toEqual([
      { url, label: "Ver documentário completo" },
    ]);
  });
});
