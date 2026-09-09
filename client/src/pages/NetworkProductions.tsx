import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { PRODUCTION_MINICLIP_CAP, PRODUCTION_PHOTO_CAP } from "@shared/networkProductions";

const buckets = [
  ["planejadas", "Planejadas"],
  ["confirmadas", "Confirmadas"],
  ["emProducao", "Em produção"],
  ["aguardandoMidia", "Aguardando mídia"],
  ["concluidas", "Concluídas"],
] as const;

export default function NetworkProductions() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const mine = trpc.productions.mine.useQuery(undefined, { enabled: Boolean(user) });
  const [openId, setOpenId] = useState<number | null>(null);
  const detail = trpc.productions.get.useQuery({ id: openId || 0 }, { enabled: Boolean(openId) });
  const transition = trpc.productions.transition.useMutation({
    onSuccess: () => { toast.success("Produção atualizada."); utils.productions.mine.invalidate(); if (openId) utils.productions.get.invalidate({ id: openId }); },
    onError: error => toast.error(error.message),
  });
  const submit = trpc.productions.submitForReview.useMutation({
    onSuccess: () => { toast.success("Enviada para revisão. Nada foi publicado."); utils.productions.mine.invalidate(); if (openId) utils.productions.get.invalidate({ id: openId }); },
    onError: error => toast.error(error.message),
  });

  return (
    <div className="public-page">
      <PageMeta title="Produções da Rede · Ojú" description="Produções operacionais do perfil profissional. Não é o Centro Administrativo." url="/rede/producoes" />
      <PublicHeader />
      <main className="container max-w-3xl pb-20 pt-16">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-oju-dende">Rede Ojú</p>
        <h1 className="mt-4 font-serif text-5xl">Minhas produções</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-oju-terra-suave">
          Janela de até {PRODUCTION_PHOTO_CAP} JPG e {PRODUCTION_MINICLIP_CAP} miniclip. Não é portfólio nem publicação automática.
        </p>
        {loading ? <p className="mt-8 text-sm">Carregando sessão…</p> : null}
        {!loading && !user ? (
          <div className="mt-10">
            <Button className="bg-oju-verde text-oju-branco" onClick={() => startLogin()}>Entrar</Button>
          </div>
        ) : null}
        {buckets.map(([key, label]) => (
          <section key={key} className="mt-8">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-oju-dende">{label}</p>
            {(mine.data?.buckets[key] || []).length ? mine.data!.buckets[key].map(item => (
              <article key={item.id} className="mt-3 border border-oju-terra/12 p-4">
                <button type="button" className="text-left" onClick={() => setOpenId(item.id)}>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-oju-terra-suave">{item.status} · {item.workType}</p>
                </button>
              </article>
            )) : <p className="mt-2 text-sm text-oju-terra-suave">Nenhuma.</p>}
          </section>
        ))}
        {detail.data ? (
          <section className="mt-10 border border-oju-terra/12 p-5">
            <p className="text-xs uppercase tracking-[.12em]">{detail.data.production.status}</p>
            <h2 className="mt-2 font-serif text-3xl">{detail.data.production.title}</h2>
            {detail.data.production.status === "Planejada" ? (
              <Button className="mt-4 bg-oju-verde text-oju-branco" disabled={transition.isPending} onClick={() => transition.mutate({ id: detail.data.production.id, status: "Confirmada" })}>Confirmar</Button>
            ) : null}
            {detail.data.production.status === "Confirmada" ? (
              <Button className="mt-4 bg-oju-verde text-oju-branco" disabled={transition.isPending} onClick={() => transition.mutate({ id: detail.data.production.id, status: "Em produção" })}>Iniciar produção</Button>
            ) : null}
            {detail.data.production.status === "Em produção" || detail.data.production.status === "Aguardando mídia" ? (
              <Button className="mt-4 bg-oju-verde text-oju-branco" disabled={submit.isPending} onClick={() => submit.mutate({ id: detail.data.production.id })}>Enviar para revisão</Button>
            ) : null}
          </section>
        ) : null}
        <Link href="/rede/convites" className="mt-12 inline-block text-sm font-semibold text-oju-dende">Convites</Link>
      </main>
    </div>
  );
}
