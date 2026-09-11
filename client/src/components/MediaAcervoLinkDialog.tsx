import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  actorCanEditPublication,
  mediaReadyToLinkEditorial,
  mediaReadyToLinkProduction,
  occupancyCopy,
  publicationOccupancyCaps,
} from "@shared/acervoFlow";
import { canAttachProductionMedia } from "@shared/networkProductions";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type MediaLike = {
  id: number;
  mediaType: "foto" | "vídeo";
  filename: string | null;
  state: "Ativo" | "Arquivado";
  publicationAllowed: boolean;
  uploadStatus: string;
  deletedAt: Date | null;
};

export function MediaAcervoLinkDialog({ item, onClose, onLinked }: { item: MediaLike; onClose: () => void; onLinked: () => void }) {
  const { user } = useAuth();
  const [kind, setKind] = useState<"publication" | "production" | null>(null);
  const [publicationId, setPublicationId] = useState<number | null>(null);
  const [productionId, setProductionId] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [biography, setBiography] = useState("");
  const [location, setLocation] = useState("");
  const [capturedAt, setCapturedAt] = useState("");
  const publications = trpc.editorial.adminList.useQuery({ limit: 40, offset: 0 }, { enabled: kind === "publication" });
  const productions = trpc.productions.mine.useQuery(undefined, { enabled: kind === "production" });
  const preview = trpc.editorial.preview.useQuery({ id: publicationId || 0 }, { enabled: Boolean(publicationId) });
  const productionDetail = trpc.productions.get.useQuery({ id: productionId || 0 }, { enabled: Boolean(productionId) });
  const attachPublication = trpc.editorial.attachMedia.useMutation({
    onError: error => toast.error(error.message),
  });
  const attachProduction = trpc.productions.attachMedia.useMutation({
    onError: error => toast.error(error.message),
  });

  const editablePublications = useMemo(
    () => (publications.data?.items || []).filter(row => actorCanEditPublication(user?.role, row.status)),
    [publications.data?.items, user?.role],
  );
  const attachableProductions = useMemo(() => {
    const buckets = productions.data?.buckets;
    if (!buckets) return [];
    return [...buckets.confirmadas, ...buckets.emProducao, ...buckets.aguardandoMidia].filter(row => canAttachProductionMedia(row.status));
  }, [productions.data?.buckets]);

  const editorialReady = mediaReadyToLinkEditorial(item);
  const productionReady = mediaReadyToLinkProduction(item);

  const publicationOccupancy = useMemo(() => {
    if (!preview.data) return null;
    const caps = publicationOccupancyCaps(preview.data.contentKind, preview.data.photoLimit, preview.data.videoLimit);
    const photos = preview.data.media.filter(media => media.mediaType === "foto").length;
    const videos = preview.data.media.filter(media => media.mediaType === "vídeo").length;
    const used = item.mediaType === "foto" ? photos : videos;
    const cap = item.mediaType === "foto" ? caps.photoCap : caps.videoCap;
    return occupancyCopy({ mediaType: item.mediaType, used, cap });
  }, [item.mediaType, preview.data]);

  const productionOccupancy = useMemo(() => {
    if (!productionDetail.data) return null;
    const photos = productionDetail.data.media.filter(media => media.mediaType === "foto").length;
    const videos = productionDetail.data.media.filter(media => media.mediaType === "vídeo").length;
    const used = item.mediaType === "foto" ? photos : videos;
    const cap = item.mediaType === "foto" ? 5 : 1;
    return occupancyCopy({ mediaType: item.mediaType, used, cap, destination: "production" });
  }, [item.mediaType, productionDetail.data]);

  async function confirm() {
    if (kind === "publication" && publicationId) {
      if (!editorialReady.ok) return toast.error(editorialReady.reason);
      if (publicationOccupancy && !publicationOccupancy.ok) return toast.error(publicationOccupancy.message);
      const documentary = preview.data?.contentKind === "Fotografia documental";
      await attachPublication.mutateAsync({
        publicationId,
        mediaId: item.id,
        caption: caption || undefined,
        biography: biography || undefined,
        location: location || undefined,
        capturedAt: documentary && capturedAt ? new Date(capturedAt) : undefined,
      });
      toast.success("Mídia ligada à publicação. Nada foi publicado automaticamente.");
      onLinked();
      return;
    }
    if (kind === "production" && productionId) {
      if (!productionReady.ok) return toast.error(productionReady.reason);
      if (productionOccupancy && !productionOccupancy.ok) return toast.error(productionOccupancy.message);
      await attachProduction.mutateAsync({ productionId, mediaId: item.id });
      toast.success("Mídia ligada à produção da Rede. Nada foi publicado automaticamente.");
      onLinked();
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ligar a um conteúdo</DialogTitle>
          <DialogDescription>
            Escolha um destino que você já pode editar. O servidor revalida autorização, território, autoria e o limite de 5 fotografias e 1 miniclip.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-oju-terra-suave">{item.filename || "Arquivo sem nome"}</p>
        {!kind ? (
          <div className="grid gap-2">
            <Button type="button" variant="outline" onClick={() => setKind("publication")}>Publicação editorial</Button>
            <Button type="button" variant="outline" onClick={() => setKind("production")}>Produção da Rede</Button>
          </div>
        ) : kind === "publication" ? (
          <div className="grid gap-3">
            {!editorialReady.ok ? <p className="text-sm text-[#8b4d24]">{editorialReady.reason}</p> : null}
            <label className="grid gap-2 text-sm font-medium">
              Publicação
              <select className="h-10 rounded-md border bg-white px-3" value={publicationId ?? ""} onChange={event => setPublicationId(event.target.value ? Number(event.target.value) : null)}>
                <option value="">Selecione</option>
                {editablePublications.map(row => (
                  <option key={row.id} value={row.id}>{row.contentKind} · {row.title} · {row.status}</option>
                ))}
              </select>
            </label>
            {preview.data ? (
              <div className="rounded-md bg-oju-papel p-3 text-sm">
                <p>{preview.data.contentKind} · {preview.data.title}</p>
                <p className="mt-1 text-oju-terra-suave">{preview.data.status}. Ligar não publica.</p>
                {publicationOccupancy ? <p className="mt-2 font-medium">{publicationOccupancy.message}</p> : null}
              </div>
            ) : null}
            {preview.data?.contentKind === "Fotografia documental" ? (
              <div className="grid gap-3">
                <label className="grid gap-2 text-sm font-medium">Título da fotografia<Input value={caption} onChange={event => setCaption(event.target.value)} /></label>
                <label className="grid gap-2 text-sm font-medium">Local<Input value={location} onChange={event => setLocation(event.target.value)} /></label>
                <label className="grid gap-2 text-sm font-medium">Data de captura<Input type="date" value={capturedAt} onChange={event => setCapturedAt(event.target.value)} /></label>
                <label className="grid gap-2 text-sm font-medium">Biografia viva<Textarea value={biography} onChange={event => setBiography(event.target.value)} /></label>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3">
            {!productionReady.ok ? <p className="text-sm text-[#8b4d24]">{productionReady.reason}</p> : null}
            <label className="grid gap-2 text-sm font-medium">
              Produção da Rede
              <select className="h-10 rounded-md border bg-white px-3" value={productionId ?? ""} onChange={event => setProductionId(event.target.value ? Number(event.target.value) : null)}>
                <option value="">Selecione</option>
                {attachableProductions.map(row => (
                  <option key={row.id} value={row.id}>{row.title} · {row.status}</option>
                ))}
              </select>
            </label>
            {productionDetail.data ? (
              <div className="rounded-md bg-oju-papel p-3 text-sm">
                <p>{productionDetail.data.production.title}</p>
                <p className="mt-1 text-oju-terra-suave">{productionDetail.data.production.status}. Ligar não publica no portal.</p>
                {productionOccupancy ? <p className="mt-2 font-medium">{productionOccupancy.message}</p> : null}
              </div>
            ) : null}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          {kind ? <Button type="button" variant="outline" onClick={() => { setKind(null); setPublicationId(null); setProductionId(null); }}>Voltar</Button> : null}
          <Button
            type="button"
            className="bg-oju-verde text-oju-branco"
            disabled={attachPublication.isPending || attachProduction.isPending || (kind === "publication" ? !publicationId : kind === "production" ? !productionId : true)}
            onClick={() => void confirm()}
          >
            Confirmar ligação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
