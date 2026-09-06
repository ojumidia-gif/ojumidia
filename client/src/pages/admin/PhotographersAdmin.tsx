import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AdminPage, EmptyAdmin, SiteReadiness } from "./_shared";
import { photographerSiteGaps } from "@/lib/editorialFlow";

export default function PhotographersAdmin() {
  const { user } = useAuth();
  const canPublish = user?.role === "administrador" || user?.role === "administrador principal";
  const utils = trpc.useUtils();
  const { data: executors, isLoading } = trpc.network.executors.useQuery();
  const createExecutor = trpc.network.createExecutor.useMutation({
    onError: error => toast.error(error.message),
  });
  const updateExecutor = trpc.network.updateExecutor.useMutation({
    onSuccess: () => { utils.network.executors.invalidate(); },
    onError: error => toast.error(error.message),
  });

  return (
    <AdminPage eyebrow="Portal → Fotógrafos" title="Cadastrar e publicar fichas.">
      <p className="-mt-4 mb-4 max-w-3xl text-sm leading-6 text-[#655e52]">Nome + apresentação. No card: Publicar no site. Crédito nas fotos do Acervo não depende desta ficha.</p>
      <section className="grid gap-7 xl:grid-cols-[380px_1fr]">
        <form className="admin-card grid gap-3 p-5" onSubmit={async event => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const note = String(data.get("note") || "").trim();
          try {
            const created = await createExecutor.mutateAsync({
              displayName: String(data.get("name")),
              email: String(data.get("email") || "") || null,
              whatsapp: String(data.get("whatsapp") || "") || null,
              instagramHandle: String(data.get("instagram") || "") || null,
              specialty: String(data.get("specialty")) as "Fotografia" | "Vídeo" | "Documentário" | "Edição" | "Produção" | "Outro",
              profileNote: note || null,
            });
            if (canPublish && note) {
              await updateExecutor.mutateAsync({ id: created.id, publicVisible: true });
              toast.success("No portal, em /fotografos.");
            } else {
              toast.success(canPublish ? "Salvo. Escreva a apresentação e publique no card." : "Salvo. Um administrador publica no site.");
              utils.network.executors.invalidate();
            }
            form.reset();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar.");
          }
        }}>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#806817]">Nova ficha</p>
          <Input required name="name" placeholder="Nome que aparece no portal" />
          <select name="specialty" className="h-10 rounded-md border bg-white px-3"><option>Fotografia</option><option>Vídeo</option><option>Documentário</option><option>Edição</option><option>Produção</option><option>Outro</option></select>
          <Input name="email" type="email" placeholder="E-mail (opcional)" />
          <Input name="whatsapp" placeholder="WhatsApp (opcional)" />
          <Input name="instagram" placeholder="@instagram autorizado (opcional)" />
          <Textarea required name="note" placeholder="Apresentação curta para o portal" />
          <Button disabled={createExecutor.isPending || updateExecutor.isPending} className="bg-[#242017] text-white">{canPublish ? "Cadastrar e publicar" : "Cadastrar"}</Button>
        </form>
        <div className="grid gap-3">
          {isLoading ? <p className="text-sm text-[#655e52]">Carregando fichas...</p> : executors?.length ? executors.map(item => (
            <article key={item.id} className="admin-card grid gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.displayName}</p>
                  <p className="mt-1 text-xs text-[#655e52]">{item.specialty}{item.publicVisible ? " · visível em /fotografos" : " · ainda fora do portal"}</p>
                </div>
                {canPublish ? (
                  <Button size="sm" variant={item.publicVisible ? "outline" : "default"} className={item.publicVisible ? "" : "bg-[#242017] text-white"} disabled={updateExecutor.isPending} onClick={() => updateExecutor.mutate({ id: item.id, publicVisible: !item.publicVisible }, { onSuccess: () => toast.success(item.publicVisible ? "Fora do site." : "No portal, em /fotografos.") })}>
                    <Camera className="mr-1 h-3.5 w-3.5" />{item.publicVisible ? "Ocultar do site" : "Publicar no site"}
                  </Button>
                ) : null}
              </div>
              <SiteReadiness items={photographerSiteGaps(item)} readyText="Pronto para /fotografos." />
              <div className="flex flex-wrap gap-2">
                <Input defaultValue={item.instagramHandle ? `@${item.instagramHandle}` : ""} placeholder="@instagram autorizado" className="max-w-xs" onBlur={event => {
                  const next = event.target.value.trim();
                  if ((item.instagramHandle ? `@${item.instagramHandle}` : "") === next) return;
                  updateExecutor.mutate({ id: item.id, instagramHandle: next || null });
                }} />
              </div>
            </article>
          )) : <EmptyAdmin text="Nenhum fotógrafo cadastrado. Crie a ficha e publique no portal." />}
        </div>
      </section>
    </AdminPage>
  );
}
