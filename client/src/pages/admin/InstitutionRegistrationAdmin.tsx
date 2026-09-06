import { Landmark, MapPin, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AdminPage } from "./_shared";

const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const profileTypes = ["Casa de tradição", "Ilê/Terreiro", "Comunidade", "Coletivo", "Iniciativa", "Centro cultural", "Liderança religiosa", "Outro"] as const;
type ProfileType = typeof profileTypes[number];

export default function InstitutionRegistrationAdmin() {
  const [consent, setConsent] = useState(false);
  const [locationPublic, setLocationPublic] = useState(false);
  const [profileType, setProfileType] = useState<ProfileType>("Casa de tradição");
  const [savedId, setSavedId] = useState<number | null>(null);
  const create = trpc.community.createInstitution.useMutation({
    onError: error => toast.error(error.message),
  });
  const publish = trpc.community.setInstitutionStatus.useMutation({
    onSuccess: () => toast.success("No portal, em /instituicoes."),
    onError: error => toast.error(error.message),
  });

  return <AdminPage eyebrow="Perfis comunitários autorizados" title="Cadastrar com consentimento visível.">
    <div className="grid max-w-5xl gap-7 lg:grid-cols-[1fr_.85fr]">
      <form className="admin-card grid gap-4 p-6" onSubmit={async event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const name = String(data.get("name"));
        try {
          const created = await create.mutateAsync({
          name,
          slug: slugify(name),
          institutionType: profileType,
          profileLabel: String(data.get("profileLabel")) || null,
          directoryScope: String(data.get("directoryScope")) as "Institucional" | "Serviço comunitário",
          serviceCategory: String(data.get("serviceCategory")) || null,
          serviceKeywords: String(data.get("serviceKeywords")) || null,
          neighborhoodText: String(data.get("neighborhoodText")) || null,
          referenceName: String(data.get("referenceName")) || null,
          referenceRole: String(data.get("referenceRole")) || null,
          description: String(data.get("description")) || null,
          locationText: String(data.get("location")) || null,
          locationVisibility: String(data.get("visibility")) as "Não divulgar" | "Aproximada" | "Pública",
          latitude: String(data.get("latitude")) || null,
          longitude: String(data.get("longitude")) || null,
          contactText: String(data.get("contact")) || null,
          contactVisibility: data.get("contactVisibility") === "on" ? "Contato institucional" : "Não divulgar",
          consentStatus: "Autorizado",
          consentNote: String(data.get("consentNote")),
          status: "Rascunho",
          });
          setSavedId(created.id);
          toast.success("Salvo com consentimento. Publique no site quando quiser.");
        } catch {
          return;
        }
      }}>
        <div className="flex items-start gap-3"><div className="rounded-xl bg-[#f6d978] p-3"><Landmark className="h-5 w-5" /></div><div><h2 className="font-serif text-3xl">Perfil comunitário documental</h2><p className="mt-1 text-sm leading-6 text-[#655e52]">Consentimento obrigatório. Depois: Publicar no site. Visibilidade paga nunca compra curadoria.</p></div></div>
        {savedId ? <p className="rounded-lg bg-[#d8eadc] p-3 text-sm text-[#2c683b]">Salvo. <Link href="/admin/comunidade?aba=instituicoes" className="underline">Abrir na comunidade</Link></p> : null}
        <label className="grid gap-2 text-sm font-medium">Nome autorizado para registro<Input required name="name" placeholder="Nome da casa, comunidade, iniciativa ou liderança" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Tipo de perfil<select value={profileType} onChange={event => setProfileType(event.target.value as ProfileType)} className="h-10 rounded border bg-white px-3">{profileTypes.map(type => <option key={type}>{type}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Outra forma de identificação<Input name="profileLabel" placeholder="Ex.: espaço cultural, grupo, casa de cuidado" /></label></div>
        <section className="grid gap-4 rounded-xl border border-[#d49b4c]/40 bg-[#fff7e8] p-4 sm:grid-cols-2"><div className="sm:col-span-2"><p className="text-sm font-semibold text-[#49321e]">Entrada na Rede de Serviços e Saberes</p><p className="mt-1 text-xs leading-5 text-[#6b4a2b]">Escolha “Serviço comunitário” para um estabelecimento ou ofício que busca visibilidade contratada. Essa presença é identificada e não altera a curadoria documental da Ojú.</p></div><label className="grid gap-2 text-sm font-medium text-[#49321e]">Entrada no diretório<select name="directoryScope" defaultValue="Institucional" className="h-10 rounded border bg-white px-3"><option>Institucional</option><option>Serviço comunitário</option></select></label><label className="grid gap-2 text-sm font-medium text-[#49321e]">Categoria de serviço<Input name="serviceCategory" placeholder="Ex.: flora, ateliê, indumentária" /></label><label className="grid gap-2 text-sm font-medium text-[#49321e] sm:col-span-2">Palavras-chave para busca<Textarea name="serviceKeywords" placeholder="Ex.: ervas, velas, roupas, contas, encomendas" /></label><label className="grid gap-2 text-sm font-medium text-[#49321e] sm:col-span-2">Bairro ou referência autorizada<Input name="neighborhoodText" placeholder="Ex.: Centro, Zona Norte ou referência territorial autorizada" /></label></section>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Pessoa de referência, se autorizada<Input name="referenceName" placeholder="Nome ou nome social autorizado" /></label><label className="grid gap-2 text-sm font-medium">Função ou denominação escolhida<Input name="referenceRole" placeholder="Ex.: Iyalorixá, Babalorixá, dirigente" /></label></div>
        <p className="-mt-2 text-xs leading-5 text-[#655e52]">Os dois campos de referência são livres: a própria pessoa ou instituição define a forma como deseja ser identificada.</p>
        <label className="grid gap-2 text-sm font-medium">História e apresentação autorizada<Textarea name="description" className="min-h-32" placeholder="Apresente somente o que a instituição autorizou documentar." /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Localização autorizada<Input name="location" placeholder="Bairro, cidade ou referência" /></label><label className="grid gap-2 text-sm font-medium">Visibilidade da localização<select name="visibility" onChange={event => setLocationPublic(event.target.value === "Pública")} className="h-10 rounded border bg-white px-3"><option>Não divulgar</option><option>Aproximada</option><option>Pública</option></select></label></div>
        {locationPublic && <section className="rounded-xl border border-[#9f7c31]/35 bg-[#fff7e8] p-4"><div className="flex gap-2 text-sm font-semibold text-[#49321e]"><MapPin className="h-5 w-5 text-[#8b4d24]" />Ponto público autorizado no mapa</div><p className="mt-2 text-xs leading-5 text-[#6b4a2b]">Informe coordenadas somente com autorização para a marcação exata no mapa público.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><Input required name="latitude" inputMode="decimal" placeholder="Latitude, ex.: -3.1190" /><Input required name="longitude" inputMode="decimal" placeholder="Longitude, ex.: -60.0217" /></div></section>}
        <label className="grid gap-2 text-sm font-medium">Contato institucional autorizado<Input name="contact" placeholder="Contato escolhido pela instituição" /></label><label className="flex gap-2 text-sm"><input name="contactVisibility" type="checkbox" />A instituição autorizou a exibição deste contato no portal.</label>
        <section className="rounded-xl border-2 border-[#d49b4c] bg-[#fff2dc] p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-[#8b4d24]" /><div><p className="font-semibold text-[#49321e]">Consentimento obrigatório</p><p className="mt-1 text-sm leading-6 text-[#6b4a2b]">Confirme que a pessoa ou instituição responsável autorizou este registro e os níveis de visibilidade escolhidos.</p></div></div><label className="mt-4 flex gap-2 text-sm font-semibold text-[#49321e]"><input required checked={consent} onChange={event => setConsent(event.target.checked)} type="checkbox" />Confirmo a autorização expressa para este cadastro.</label><Textarea required name="consentNote" className="mt-4 bg-white" placeholder="Como, quando e por quem a autorização foi confirmada." /></section>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!consent || create.isPending} className="bg-[#242017] text-white">{create.isPending ? "Salvando..." : "Salvar com consentimento"}</Button>
          {savedId ? <Button type="button" disabled={publish.isPending} className="bg-[#242017] text-white" onClick={() => publish.mutate({ id: savedId, status: "Publicada" })}>Publicar no site</Button> : null}
        </div>
      </form>
      <aside className="h-fit rounded-2xl border border-[#242017]/10 bg-[#f7f3e9] p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Proteção aplicada</p><h2 className="mt-3 font-serif text-3xl">A comunidade define sua presença.</h2><ul className="mt-5 grid gap-3 text-sm leading-6 text-[#655e52]"><li>O endereço começa como <b>Não divulgar</b>.</li><li>O mapa só recebe ponto com localização pública e coordenadas autorizadas.</li><li>O contato só é exibido com marcação específica.</li><li>O consentimento é registrado junto ao perfil.</li><li>Visibilidade institucional não altera busca, curadoria nem publicação editorial.</li></ul></aside>
    </div>
  </AdminPage>;
}
