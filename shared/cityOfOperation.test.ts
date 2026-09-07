import { describe, expect, it } from "vitest";
import { BRAZIL_MUNICIPALITIES } from "./brazilMunicipalities";
import { BRAZIL_STATES, municipalitiesForUf, resolveCityOfOperation, taxonomyDimensionLabel } from "./brazilPlaces";

describe("cidade de atuação no Brasil", () => {
  it("cobre os 27 estados e os municípios IBGE, com capitais no topo", () => {
    expect(BRAZIL_STATES).toHaveLength(27);
    const total = Object.values(BRAZIL_MUNICIPALITIES).reduce((sum, rows) => sum + rows.length, 0);
    expect(total).toBeGreaterThanOrEqual(5500);
    expect(BRAZIL_MUNICIPALITIES.AM?.some(([, name]) => name === "Manaus")).toBe(true);
    expect(municipalitiesForUf("AM")[0]?.name).toBe("Manaus");
  });

  it("nomeia município e UF, e aceita Outro com cidade digitada", () => {
    const manaus = BRAZIL_MUNICIPALITIES.AM.find(([, name]) => name === "Manaus");
    expect(manaus).toBeTruthy();
    expect(resolveCityOfOperation({ uf: "AM", ibgeId: manaus![0], customName: "" })).toMatchObject({
      name: "Manaus — AM",
      slug: `ibge-${manaus![0]}`,
    });
    expect(resolveCityOfOperation({ uf: "AM", ibgeId: "outro", customName: "Comunidade do Rio Negro" }).name).toBe("Comunidade do Rio Negro — AM");
    expect(taxonomyDimensionLabel("Território")).toBe("Cidade de atuação");
  });
});
