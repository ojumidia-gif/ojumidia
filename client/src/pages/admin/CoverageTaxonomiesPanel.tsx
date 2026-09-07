import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ensureGoogleMaps } from "@/components/Map";
import { MapPinned } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const documentaryDimensions = ["Território", "Localização", "Pessoa/organização", "Evento", "Tema"] as const;
type Dimension = typeof documentaryDimensions[number];

const emptyHint: Record<Dimension, string> = {
  Território: "Cadastre o território real aqui. Homolog A/B são só teste de sistema.",
  Localização: "Digite o lugar, o bairro ou o endereço autorizado.",
  "Pessoa/organização": "Cadastre a casa, o coletivo ou a organização desta história.",
  Evento: "Cadastre o encontro, a festa ou o culto, se houver.",
  Tema: "Cadastre o tema documental, se quiser agrupar no acervo.",
};

async function geocodeAuthorizedAddress(address: string) {
  try {
    await ensureGoogleMaps();
    if (!window.google?.maps?.Geocoder) return null;
    const geocoder = new window.google.maps.Geocoder();
    const located = await new Promise<google.maps.LatLng | null>(resolve => {
      geocoder.geocode({ address, region: "BR", language: "pt-BR" }, (results, status) => {
        resolve(status === "OK" && results?.[0]?.geometry?.location ? results[0].geometry.location : null);
      });
    });
    if (!located) return null;
    return { latitude: located.lat().toFixed(7), longitude: located.lng().toFixed(7) };
  } catch {
    return null;
  }
}

export function CoverageTaxonomiesPanel({ publicationId, version, initialIds, contentKind = "conteúdo" }: { publicationId: number; version: number; initialIds: number[]; contentKind?: string }) {
  const utils = trpc.useUtils();
  const { data } = trpc.editorial.taxonomies.useQuery();
  const [selected, setSelected] = useState<number[]>(initialIds);
  const [expectedVersion, setExpectedVersion] = useState(version);
  const [drafts, setDrafts] = useState<Record<Dimension, string>>({ Território: "", Localização: "", "Pessoa/organização": "", Evento: "", Tema: "" });
  const [address, setAddress] = useState("");
  useEffect(() => setSelected(initialIds), [initialIds.join(",")]);
  useEffect(() => setExpectedVersion(version), [version]);
  const save = trpc.editorial.update.useMutation({
    onSuccess: result => {
      toast.success("Relações documentais salvas.");
      setExpectedVersion(result.version);
      utils.editorial.preview.invalidate({ id: publicationId });
      utils.editorial.adminList.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const create = trpc.editorial.createTaxonomy.useMutation({
    onError: error => toast.error(error.message),
  });
  const grouped = documentaryDimensions.map(dimension => [dimension, data?.filter(item => item.dimension === dimension) || []] as const);
  const toggle = (id: number) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const addAndLink = async (dimension: Dimension) => {
    const name = drafts[dimension].trim();
    if (name.length < 2) { toast.error("Informe um nome com pelo menos 2 letras."); return; }
    const coords = dimension === "Localização" && address.trim() ? await geocodeAuthorizedAddress(address.trim()) : null;
    const created = await create.mutateAsync({
      dimension,
      name,
      description: dimension === "Localização" ? (address.trim() || undefined) : undefined,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      mapVisibility: dimension === "Localização" && coords ? "Aproximada" : undefined,
    });
    const next = selected.includes(created.id) ? selected : [...selected, created.id];
    setSelected(next);
    setDrafts(current => ({ ...current, [dimension]: "" }));
    if (dimension === "Localização") setAddress("");
    await save.mutateAsync({ id: publicationId, expectedVersion, taxonomyIds: next });
    utils.editorial.taxonomies.invalidate();
  };
  return (
    <section className="admin-card mt-8 p-6">
      <div className="flex gap-3">
        <div className="rounded-xl bg-[#f6d978] p-3"><MapPinned className="h-5 w-5" /></div>
        <div>
          <p className="font-serif text-2xl">Relações documentais</p>
          <p className="mt-1 text-sm text-oju-terra-suave">{contentKind === "Fotografia documental" ? "Ligue o território. Sem isso a coleção não entra no mapa." : "Marque o território. Cadastre o lugar aqui se ainda não existir."}</p>
          <p className="mt-2 text-xs leading-5 text-oju-terra-suave"><Link href="/admin/territorios" className="font-semibold underline">Abrir cadastro completo de territórios</Link> · coordenadas públicas só com autorização da casa.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {grouped.map(([dimension, entries]) => (
          <div key={dimension}>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#806817]">{dimension}</p>
            <div className="mt-3 space-y-2">
              {entries.length ? entries.map(item => (
                <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-oju-terra/10 bg-white p-3 text-sm">
                  <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => toggle(item.id)} />
                  <span>
                    <strong>{item.name}</strong>
                    {item.description ? <span className="mt-1 block text-xs text-oju-terra-suave">{item.description}</span> : null}
                  </span>
                </label>
              )) : <p className="text-sm text-[#756e60]">{emptyHint[dimension]}</p>}
              <div className="rounded-lg border border-dashed border-oju-terra/15 bg-[#f7f3e9] p-3">
                <Input value={drafts[dimension]} onChange={event => setDrafts(current => ({ ...current, [dimension]: event.target.value }))} placeholder={dimension === "Localização" ? "Nome do lugar" : `Novo ${dimension.toLowerCase()}`} />
                {dimension === "Localização" ? <Input className="mt-2" value={address} onChange={event => setAddress(event.target.value)} placeholder="Endereço, bairro ou referência autorizada" /> : null}
                <Button type="button" size="sm" variant="outline" className="mt-2" disabled={create.isPending || save.isPending} onClick={() => addAndLink(dimension)}>Cadastrar e ligar</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button disabled={save.isPending} onClick={() => save.mutate({ id: publicationId, expectedVersion, taxonomyIds: selected })} className="bg-oju-verde text-oju-branco">{save.isPending ? "Salvando..." : "Salvar relações documentais"}</Button>
      </div>
    </section>
  );
}
