import { describe, expect, it } from "vitest";
import { searchInput } from "./editorial";

describe("busca editorial avançada", () => {
  it("aceita a combinação de tema, território, tipo, período e palavra-chave", () => {
    const result = searchInput.safeParse({
      query: "memória",
      themeId: 1,
      territoryId: 2,
      contentTypeId: 3,
      startDate: new Date("2026-01-01T00:00:00Z"),
      endDate: new Date("2026-12-31T23:59:59Z"),
    });
    expect(result.success).toBe(true);
  });
});
