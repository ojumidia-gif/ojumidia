import { BRAZIL_STATES, OTHER_CITY_ID, emptyCitySelection, municipalitiesForUf, type CitySelection } from "@shared/brazilPlaces";

const defaultSelectClass = "h-11 w-full min-w-0 rounded border border-oju-terra/12 bg-oju-paz-claro px-3 text-oju-terra";
const defaultInputClass = "h-11 w-full min-w-0 rounded border border-oju-terra/12 bg-oju-paz-claro px-3 text-oju-terra";

export function CityOfOperationSelect({
  value,
  onChange,
  required = false,
  label = "Cidade de atuação",
  hint = "Estado, capital e município. Se a cidade não estiver na lista, escolha Outro e escreva o nome.",
  selectClassName = defaultSelectClass,
  inputClassName = defaultInputClass,
}: {
  value: CitySelection;
  onChange: (next: CitySelection) => void;
  required?: boolean;
  label?: string;
  hint?: string;
  selectClassName?: string;
  inputClassName?: string;
}) {
  const state = BRAZIL_STATES.find(item => item.uf === value.uf);
  const cities = value.uf ? municipalitiesForUf(value.uf) : [];
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">{label}{required ? null : <span className="font-normal text-oju-terra-suave"> (opcional)</span>}</legend>
      {hint ? <p className="text-xs leading-5 text-oju-terra-suave">{hint}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Estado
          <select required={required} value={value.uf} className={selectClassName} onChange={event => onChange({ uf: event.target.value, ibgeId: "", customName: "" })}>
            <option value="">Selecione o estado</option>
            {BRAZIL_STATES.map(item => <option key={item.uf} value={item.uf}>{item.uf} — {item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">Município
          <select required={required} disabled={!value.uf} value={value.ibgeId === "" ? "" : String(value.ibgeId)} className={selectClassName} onChange={event => {
            const next = event.target.value;
            onChange({
              ...value,
              ibgeId: next === OTHER_CITY_ID ? OTHER_CITY_ID : next ? Number(next) : "",
              customName: next === OTHER_CITY_ID ? value.customName : "",
            });
          }}>
            <option value="">{value.uf ? "Selecione a cidade" : "Escolha o estado primeiro"}</option>
            {cities.map(item => <option key={item.ibge} value={item.ibge}>{item.name}{state?.capital === item.name ? " (capital)" : ""}</option>)}
            <option value={OTHER_CITY_ID}>Outro — informar cidade</option>
          </select>
        </label>
      </div>
      {value.ibgeId === OTHER_CITY_ID ? (
        <label className="grid gap-2 text-sm">Cidade não listada
          <input required={required} minLength={2} value={value.customName} onChange={event => onChange({ ...value, customName: event.target.value })} className={inputClassName} placeholder="Escreva a cidade de atuação" />
        </label>
      ) : null}
    </fieldset>
  );
}

export { emptyCitySelection };
