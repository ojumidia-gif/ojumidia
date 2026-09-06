import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserRoundCheck, Video } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type RequestForNetwork = { id: number; proposalAmount?: string | number | null };

export function NetworkAssignment({ request }: { request: RequestForNetwork }) {
  const { user } = useAuth();
  const principal = user?.role === "administrador principal";
  const utils = trpc.useUtils();
  const { data: executors } = trpc.network.executors.useQuery();
  const { data: network } = trpc.network.networkForRequest.useQuery({ requestId: request.id });
  const { data: clips } = trpc.media.eligibleMiniclips.useQuery();
  const refresh = () => { utils.network.networkForRequest.invalidate({ requestId: request.id }); utils.commercial.requestActivities.invalidate({ requestId: request.id }); };
  const createExecutor = trpc.network.createExecutor.useMutation({ onSuccess: () => { toast.success("Profissional executor adicionado à Rede Ojú."); utils.network.executors.invalidate(); }, onError: error => toast.error(error.message) });
  const updateExecutor = trpc.network.updateExecutor.useMutation({ onSuccess: () => { toast.success("Visibilidade pública atualizada."); utils.network.executors.invalidate(); }, onError: error => toast.error(error.message) });
  const prepare = trpc.network.prepareClosing.useMutation({ onSuccess: result => { toast.success(result.policyApplied ? `Fechamento preparado com política v${result.policyApplied.version}.` : "Fechamento salvo aguardando definição de política."); refresh(); }, onError: error => toast.error(error.message) });
  const assignMiniclip = trpc.network.assignMiniclip.useMutation({ onSuccess: result => { toast.success(result.authorizedForHome ? "Miniclip atribuído à contratação." : "Miniclip registrado. Ele não pode aparecer na Home sem autorização editorial válida."); refresh(); }, onError: error => toast.error(error.message) });
  const removeHome = trpc.network.removeMiniclipFromHome.useMutation({ onSuccess: () => { toast.success("Miniclip removido da Home e preservado no histórico."); refresh(); }, onError: error => toast.error(error.message) });
  const closing = network?.closing;
  const activeMiniclip = network?.miniclips.find(item => item.status === "Ativo");

  return (
    <section className="mt-6 border-t border-[#242017]/10 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Rede Ojú e produção</p>
          <h3 className="mt-2 font-serif text-2xl">Executor, fechamento e miniclip.</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#655e52]">O administrador responsável organiza a produção. O profissional executor é independente do acesso administrativo. Esta área só prepara dados e política aplicada: não realiza pagamento, nota fiscal ou integração bancária.</p>
        </div>
        <UserRoundCheck className="h-7 w-7 text-[#806817]" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <form className="grid gap-3 rounded-xl border border-[#242017]/10 bg-[#faf8f2] p-4" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); createExecutor.mutate({ displayName: String(form.get("executorName")), email: String(form.get("executorEmail") || "") || null, whatsapp: String(form.get("executorWhatsapp") || "") || null, specialty: String(form.get("executorSpecialty")) as "Fotografia" | "Vídeo" | "Documentário" | "Edição" | "Produção" | "Outro", profileNote: String(form.get("executorNote") || "") || null }); event.currentTarget.reset(); }}>
          <p className="text-sm font-semibold">Adicionar profissional executor</p>
          <Input required name="executorName" placeholder="Nome profissional" />
          <div className="grid gap-2 sm:grid-cols-2"><Input name="executorEmail" type="email" placeholder="E-mail (opcional)" /><Input name="executorWhatsapp" placeholder="WhatsApp (opcional)" /></div>
          <select name="executorSpecialty" className="h-10 rounded border bg-white px-3"><option>Fotografia</option><option>Vídeo</option><option>Documentário</option><option>Edição</option><option>Produção</option><option>Outro</option></select>
          <Textarea name="executorNote" placeholder="Observação privada de disponibilidade ou especialidade" />
          <Button type="submit" size="sm" disabled={createExecutor.isPending} className="w-fit bg-[#242017] text-white">Adicionar à rede</Button>
          {executors?.length ? <div className="grid gap-2 border-t border-[#242017]/10 pt-3">{executors.map(executor => <div key={executor.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{executor.displayName} · {executor.specialty}{executor.publicVisible ? " · visível no portal" : ""}</span>{principal ? <Button type="button" size="sm" variant="outline" disabled={updateExecutor.isPending} onClick={() => updateExecutor.mutate({ id: executor.id, publicVisible: !executor.publicVisible })}>{executor.publicVisible ? "Ocultar do portal" : "Tornar público no Ojú"}</Button> : null}</div>)}</div> : null}
        </form>
        <form className="grid gap-3 rounded-xl border border-[#242017]/10 bg-[#faf8f2] p-4" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); prepare.mutate({ requestId: request.id, executorId: form.get("executorId") ? Number(form.get("executorId")) : null, scope: String(form.get("scope")) as "Cobertura" | "Documentário" | "Fotografia" | "Outro", grossAmount: form.get("grossAmount") ? Number(form.get("grossAmount")) : null, notes: String(form.get("closingNote") || "") || null }); }}>
          <p className="text-sm font-semibold">Fechamento conceitual</p>
          <select name="executorId" defaultValue={closing?.executorId || ""} className="h-10 rounded border bg-white px-3"><option value="">Executor ainda não definido</option>{executors?.map(executor => <option key={executor.id} value={executor.id}>{executor.displayName} · {executor.specialty}</option>)}</select>
          <div className="grid gap-2 sm:grid-cols-2"><select name="scope" defaultValue="Cobertura" className="h-10 rounded border bg-white px-3"><option>Cobertura</option><option>Documentário</option><option>Fotografia</option><option>Outro</option></select><Input name="grossAmount" type="number" min="0" step="0.01" defaultValue={closing?.grossAmount || request.proposalAmount || ""} placeholder="Valor bruto (opcional)" /></div>
          <Textarea name="closingNote" defaultValue={closing?.notes || ""} placeholder="Observação interna. Percentuais são copiados da política ativa somente quando ela existir." />
          <div className="rounded-lg bg-white px-3 py-2 text-xs text-[#655e52]">{closing?.commercialPolicyVersion ? `Política v${closing.commercialPolicyVersion} registrada · ${closing.financialStatus}` : "Nenhuma política aplicada ainda. O fechamento permanece aguardando definição."}</div>
          <Button type="submit" size="sm" disabled={prepare.isPending} className="w-fit bg-[#242017] text-white">Preparar fechamento</Button>
        </form>
      </div>
      <section className="mt-5 rounded-xl border border-[#242017]/10 bg-[#f7f3e9] p-4">
        <div className="flex gap-2">
          <Video className="h-5 w-5 text-[#806817]" />
          <div>
            <p className="text-sm font-semibold">Miniclip da contratação</p>
            <p className="mt-1 text-xs leading-5 text-[#655e52]">Um vídeo de até 60s, autorizado, ligado a este pedido. Isso é produção/monetização. Só o Super Admin coloca na Home nacional.</p>
          </div>
        </div>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); assignMiniclip.mutate({ requestId: request.id, mediaId: Number(form.get("mediaId")), featureOnHome: principal && form.get("home") === "on" }); }}>
          <label className="grid min-w-[240px] gap-2 text-sm font-medium">Vídeo do Acervo
            <select required name="mediaId" defaultValue="" className="h-10 rounded border bg-white px-3">
              <option value="" disabled>Selecione um vídeo ativo de até 60 segundos</option>
              {clips?.map(clip => <option key={clip.id} value={clip.id}>{clip.filename || clip.credit} · {clip.durationSeconds}s</option>)}
            </select>
          </label>
          {principal ? <label className="flex h-10 items-center gap-2 text-sm"><input name="home" type="checkbox" />Destacar na Home após autorização</label> : <p className="text-xs leading-5 text-[#655e52]">A Home nacional não aparece nesta carteira.</p>}
          <Button type="submit" size="sm" disabled={assignMiniclip.isPending} className="bg-[#242017] text-white">{activeMiniclip ? "Substituir miniclip" : "Definir miniclip"}</Button>
        </form>
        {network?.miniclips.length ? (
          <div className="mt-4 grid gap-2">
            {network.miniclips.map(miniclip => (
              <div key={miniclip.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                <span>Miniclip #{miniclip.id} · {miniclip.status}{miniclip.homeFeatured ? " · em destaque na Home" : ""}{!miniclip.authorizedForHome ? " · sem autorização para Home" : ""}</span>
                {principal && miniclip.homeFeatured ? <Button type="button" size="sm" variant="outline" disabled={removeHome.isPending} onClick={() => removeHome.mutate({ id: miniclip.id })}>Retirar da Home</Button> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
