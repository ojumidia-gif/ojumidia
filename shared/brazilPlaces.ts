import { BRAZIL_MUNICIPALITIES } from "./brazilMunicipalities";

export const OTHER_CITY_ID = "outro" as const;

export const BRAZIL_STATES = [
  { uf: "AC", name: "Acre", capital: "Rio Branco" },
  { uf: "AL", name: "Alagoas", capital: "Maceió" },
  { uf: "AP", name: "Amapá", capital: "Macapá" },
  { uf: "AM", name: "Amazonas", capital: "Manaus" },
  { uf: "BA", name: "Bahia", capital: "Salvador" },
  { uf: "CE", name: "Ceará", capital: "Fortaleza" },
  { uf: "DF", name: "Distrito Federal", capital: "Brasília" },
  { uf: "ES", name: "Espírito Santo", capital: "Vitória" },
  { uf: "GO", name: "Goiás", capital: "Goiânia" },
  { uf: "MA", name: "Maranhão", capital: "São Luís" },
  { uf: "MT", name: "Mato Grosso", capital: "Cuiabá" },
  { uf: "MS", name: "Mato Grosso do Sul", capital: "Campo Grande" },
  { uf: "MG", name: "Minas Gerais", capital: "Belo Horizonte" },
  { uf: "PA", name: "Pará", capital: "Belém" },
  { uf: "PB", name: "Paraíba", capital: "João Pessoa" },
  { uf: "PR", name: "Paraná", capital: "Curitiba" },
  { uf: "PE", name: "Pernambuco", capital: "Recife" },
  { uf: "PI", name: "Piauí", capital: "Teresina" },
  { uf: "RJ", name: "Rio de Janeiro", capital: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte", capital: "Natal" },
  { uf: "RS", name: "Rio Grande do Sul", capital: "Porto Alegre" },
  { uf: "RO", name: "Rondônia", capital: "Porto Velho" },
  { uf: "RR", name: "Roraima", capital: "Boa Vista" },
  { uf: "SC", name: "Santa Catarina", capital: "Florianópolis" },
  { uf: "SP", name: "São Paulo", capital: "São Paulo" },
  { uf: "SE", name: "Sergipe", capital: "Aracaju" },
  { uf: "TO", name: "Tocantins", capital: "Palmas" },
] as const;

export type BrazilUf = (typeof BRAZIL_STATES)[number]["uf"];

export type CitySelection = {
  uf: string;
  ibgeId: number | typeof OTHER_CITY_ID | "";
  customName: string;
};

export function emptyCitySelection(): CitySelection {
  return { uf: "", ibgeId: "", customName: "" };
}

export function brazilState(uf: string) {
  return BRAZIL_STATES.find(item => item.uf === uf.toUpperCase()) ?? null;
}

export function municipalitiesForUf(uf: string) {
  const state = brazilState(uf);
  const list = (BRAZIL_MUNICIPALITIES[uf.toUpperCase()] || []).map(([ibge, name]) => ({ ibge, name }));
  if (!state) return list;
  return list.sort((a, b) => {
    if (a.name === state.capital && b.name !== state.capital) return -1;
    if (b.name === state.capital && a.name !== state.capital) return 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function cityDisplayName(city: string, uf: string) {
  return `${city.trim()} — ${uf.toUpperCase()}`;
}

export function slugifyPlace(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function taxonomyDimensionLabel(dimension: string) {
  return dimension === "Território" ? "Cidade de atuação" : dimension;
}

export function resolveCityOfOperation(selection: CitySelection) {
  const uf = selection.uf.toUpperCase();
  const state = brazilState(uf);
  if (!state) throw new Error("Selecione o estado.");
  if (selection.ibgeId === OTHER_CITY_ID) {
    const custom = selection.customName.trim();
    if (custom.length < 2) throw new Error("Informe a cidade de atuação.");
    return {
      name: cityDisplayName(custom, uf),
      slug: `cidade-${slugifyPlace(custom)}-${uf.toLowerCase()}`,
      description: `Cidade informada fora da lista IBGE · ${state.name}`,
      ibgeId: null as number | null,
    };
  }
  const ibgeId = typeof selection.ibgeId === "number" ? selection.ibgeId : Number(selection.ibgeId);
  if (!Number.isInteger(ibgeId) || ibgeId <= 0) throw new Error("Selecione a cidade de atuação.");
  const found = (BRAZIL_MUNICIPALITIES[uf] || []).find(([id]) => id === ibgeId);
  if (!found) throw new Error("A cidade escolhida não pertence a este estado.");
  return {
    name: cityDisplayName(found[1], uf),
    slug: `ibge-${ibgeId}`,
    description: `Município IBGE ${ibgeId} · ${state.name}${found[1] === state.capital ? " · capital" : ""}`,
    ibgeId,
  };
}

export function citySelectionText(selection: CitySelection) {
  try {
    return resolveCityOfOperation(selection).name;
  } catch {
    return "";
  }
}
