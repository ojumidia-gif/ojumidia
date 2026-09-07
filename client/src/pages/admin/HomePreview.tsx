import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft } from "lucide-react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function HomePreview() {
  const [, params] = useRoute("/admin/home-preview/:id");
  const { data, isLoading } = trpc.editorial.preview.useQuery({ id: Number(params?.id) }, { enabled: Boolean(params?.id) });
  const cover = data?.media.find(item => item.isCover) || data?.media[0];
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/destaques" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Voltar à curadoria nacional</Link>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-oju-terra-suave">Prévia no mesmo olhar do portal. Isto mostra como o conteúdo pode entrar na Home nacional — não substitui a capa da história nem publica sozinho.</p>
        {isLoading ? <p className="mt-12">Montando a prévia da Home...</p> : data ? (
          <section className="mt-8 overflow-hidden rounded-2xl bg-[#070605] text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#ed9c58]">Prévia da Home nacional · Equipe Ojú</p>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs">{data.homePlacement}</span>
            </div>
            <div className="grid min-h-[390px] items-end gap-8 p-8 md:grid-cols-[1.1fr_.9fr] md:p-12">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#ed9c58]">{data.contentKind}</p>
                <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-[.98]">{data.title}</h1>
                <p className="mt-6 max-w-xl text-white/70">{data.summary || data.subtitle || "Sem descrição editorial."}</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
                {cover?.assetUrl ? (cover.mediaType === "vídeo" ? <video src={cover.assetUrl} className="aspect-video w-full object-cover" muted /> : <img src={cover.assetUrl} alt="" className="aspect-video w-full object-cover" />) : <div className="aspect-video grid place-items-center text-sm text-white/40">Sem capa</div>}
                <div className="p-5">
                  <p className="font-serif text-2xl">{data.homePlacement === "Nenhum" ? "Fora da vitrine nacional." : data.homePlacement}</p>
                  <p className="mt-3 text-sm leading-6 text-white/55">Relevância {data.relevance}/100 · destaque manual {data.manualFeatured ? "ativo" : "inativo"}.</p>
                </div>
              </div>
            </div>
          </section>
        ) : <p className="mt-12">Conteúdo não encontrado.</p>}
      </div>
    </DashboardLayout>
  );
}
