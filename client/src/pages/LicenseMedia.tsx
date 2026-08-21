import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

export default function LicenseMedia() {
  const [mediaId, setMediaId] = useState(() => Number(new URLSearchParams(window.location.search).get("mid")) || 0);
  const [name, setName] = useState(""); const [organization, setOrganization] = useState("");
  const [whatsapp, setWhatsapp] = useState(""); const [purpose, setPurpose] = useState(""); const [scope, setScope] = useState("");
  const [sent, setSent] = useState(false);
  const eligibility = trpc.revenue.mediaEligibleForLicense.useQuery({ mediaId }, { enabled: mediaId > 0 });
  const create = trpc.revenue.createPublic.useMutation({ onSuccess: () => setSent(true) });
  const eligible = eligibility.data?.eligible;

  return <div className="min-h-screen overflow-x-hidden bg-[#070605] text-white"><PublicHeader cinematic />
    <main className="container grid gap-10 pb-16 pt-32 lg:grid-cols-[.9fr_1.1fr]">
      <section className="pt-8"><ShieldCheck className="h-8 w-8 text-[#ef9e59]" /><p className="mt-8 text-[10px] font-bold uppercase tracking-[.14em] text-[#ef9e59]">Licenciamento de mídia</p><h1 className="mt-5 max-w-xl break-words font-serif text-6xl leading-[.94]">Uso responsável começa pelo reconhecimento do direito.</h1><p className="mt-7 max-w-xl text-base leading-7 text-white/65">A solicitação não concede uso automático. A Ojú verifica origem, crédito, autorização, finalidade e validade da mídia antes de qualquer proposta.</p></section>
      <section className="rounded border border-white/15 bg-[#100d0a] p-6 sm:p-8">{sent ? <div className="py-12 text-center"><p className="font-serif text-4xl">Solicitação registrada.</p><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/65">A equipe verificará os direitos e retornará pelo WhatsApp informado.</p><Link href="/acervo" className="mt-8 inline-flex text-sm font-bold text-[#ef9e59]">Voltar ao acervo</Link></div> : <form onSubmit={event => { event.preventDefault(); if (eligible) create.mutate({ leadType: "Licenciamento de mídia", contactName: name, organization: organization || undefined, whatsapp, purpose, mediaId, licenseScope: scope }); }} className="grid gap-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ef9e59]">Solicitar uso</p><h2 className="mt-3 font-serif text-4xl">Licencie com transparência.</h2></div>
        <label className="grid gap-2 text-sm">Identificador da mídia<Input required type="number" min="1" value={mediaId || ""} onChange={event => setMediaId(Number(event.target.value))} className="border-white/15 bg-[#17130f] text-white" /></label>
        {mediaId > 0 && <p className={`text-xs leading-5 ${eligible ? "text-[#8dda95]" : "text-[#ef9e59]"}`}>{eligibility.isLoading ? "Verificando direitos registrados..." : eligible ? `Mídia disponível para análise · crédito: ${eligibility.data?.media?.credit}` : eligibility.data?.reason || "Não foi possível verificar esta mídia."}</p>}
        <label className="grid gap-2 text-sm">Nome ou organização<Input required value={name} onChange={event => setName(event.target.value)} className="border-white/15 bg-[#17130f] text-white" /></label>
        <label className="grid gap-2 text-sm">Instituição <span className="text-white/40">(opcional)</span><Input value={organization} onChange={event => setOrganization(event.target.value)} className="border-white/15 bg-[#17130f] text-white" /></label>
        <label className="grid gap-2 text-sm">WhatsApp<Input required value={whatsapp} onChange={event => setWhatsapp(event.target.value)} className="border-white/15 bg-[#17130f] text-white" /></label>
        <label className="grid gap-2 text-sm">Finalidade do uso<Input required value={purpose} onChange={event => setPurpose(event.target.value)} placeholder="Ex.: livro, pesquisa, imprensa ou audiovisual" className="border-white/15 bg-[#17130f] text-white" /></label>
        <label className="grid gap-2 text-sm">Escopo desejado<Textarea required value={scope} onChange={event => setScope(event.target.value)} placeholder="Onde, por quanto tempo e em qual formato a mídia será usada." className="min-h-28 border-white/15 bg-[#17130f] text-white" /></label>
        <Button disabled={!eligible || create.isPending} className="bg-[#ed9c58] text-[#24140b] hover:bg-[#f4b273]">{create.isPending ? "Enviando..." : "Solicitar análise de licença"}</Button>
      </form>}</section>
    </main>
  </div>;
}
