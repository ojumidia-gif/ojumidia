import { Button } from "@/components/ui/button";
import { uploadMediaFile, type MediaUploadResult, type UploadKind } from "@/lib/mediaUpload";
import { nanoid } from "nanoid";
import { RotateCcw, Star, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState } from "react";

export type StagedMedia = {
  localId: string;
  file: File;
  kind: UploadKind;
  previewUrl: string;
  status: "Selecionado" | "Preparando" | "Enviando" | "Processando" | "Pronto" | "Falhou";
  progress: number;
  error?: string;
  durationSeconds?: number;
  result?: MediaUploadResult;
};

function classifyFile(file: File, defaultKind: UploadKind): UploadKind {
  if (defaultKind === "miniclipe") return "miniclipe";
  if (file.type.startsWith("video/")) return "vídeo";
  return "foto";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaStage({
  items,
  coverLocalId,
  onRemove,
  onRetry,
  onCover,
}: {
  items: StagedMedia[];
  coverLocalId?: string | null;
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
  onCover?: (localId: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {items.map(item => (
        <article key={item.localId} className="overflow-hidden rounded-xl border border-oju-terra/10 bg-white">
          <div className="relative grid h-32 place-items-center bg-[#191611]">
            {item.kind === "foto" ? <img src={item.previewUrl} alt="" className="h-full w-full object-cover" /> : <video src={item.previewUrl} muted playsInline className="h-full w-full object-cover" />}
            {onCover && item.kind === "foto" ? (
              <button type="button" onClick={() => onCover(item.localId)} className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold ${coverLocalId === item.localId ? "bg-oju-dourado text-oju-terra" : "bg-black/60 text-white"}`}>
                <Star className="mr-1 inline h-3 w-3" />{coverLocalId === item.localId ? "Capa" : "Usar como capa"}
              </button>
            ) : null}
          </div>
          <div className="space-y-1 p-3">
            <p className="truncate text-xs font-semibold">{item.file.name}</p>
            <p className="text-[11px] text-oju-terra-suave">{item.kind} · {formatSize(item.file.size)}{item.durationSeconds ? ` · ${item.durationSeconds}s` : ""}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-oju-papel"><div className={`h-full ${item.status === "Falhou" ? "bg-[#8b3a16]" : "bg-[#806817]"}`} style={{ width: `${item.status === "Pronto" ? 100 : item.progress}%` }} /></div>
            <p className={`text-[11px] font-bold ${item.status === "Falhou" ? "text-[#8b3a16]" : "text-[#496b3b]"}`}>{item.status}{item.status === "Enviando" ? ` ${item.progress}%` : ""}</p>
            {item.error ? <p className="text-[11px] leading-4 text-[#8b3a16]">{item.error}</p> : null}
            <div className="flex gap-2 pt-1">
              {item.status === "Selecionado" || item.status === "Falhou" ? <button type="button" onClick={() => onRemove(item.localId)} className="text-[11px] font-semibold text-oju-terra-suave"><Trash2 className="mr-1 inline h-3 w-3" />Remover</button> : null}
              {item.status === "Falhou" ? <button type="button" onClick={() => onRetry(item.localId)} className="text-[11px] font-semibold text-[#806817]"><RotateCcw className="mr-1 inline h-3 w-3" />Tentar novamente</button> : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function useMediaStage(defaultKind: UploadKind = "foto") {
  const [items, setItems] = useState<StagedMedia[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const addFiles = (files: File[]) => {
    const next = files.map(file => ({
      localId: nanoid(),
      file,
      kind: classifyFile(file, defaultKind),
      previewUrl: URL.createObjectURL(file),
      status: "Selecionado" as const,
      progress: 0,
    }));
    setItems(current => [...current, ...next]);
    return next;
  };

  const remove = (localId: string) => {
    const item = itemsRef.current.find(entry => entry.localId === localId);
    if (item) URL.revokeObjectURL(item.previewUrl);
    setItems(current => current.filter(entry => entry.localId !== localId));
  };

  const update = (localId: string, patch: Partial<StagedMedia>) => {
    setItems(current => current.map(entry => entry.localId === localId ? { ...entry, ...patch } : entry));
  };

  const clear = () => {
    itemsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
  };

  const uploadOne = async (item: StagedMedia, context?: { partnerId?: number | null; territoryId?: number | null }) => {
    update(item.localId, { status: "Enviando", progress: 1, error: undefined });
    try {
      const result = await uploadMediaFile(item.file, { ...context, uploadId: item.result?.uploadId }, percent => {
        update(item.localId, { status: percent >= 100 ? "Processando" : "Enviando", progress: percent });
      });
      update(item.localId, { status: "Pronto", progress: 100, result, durationSeconds: result.durationSeconds });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no envio.";
      update(item.localId, { status: "Falhou", error: message });
      throw error;
    }
  };

  return { items, addFiles, remove, update, uploadOne, clear };
}

export function MediaAddButton({
  accept,
  label,
  multiple = true,
  counts,
  onFiles,
}: {
  accept: string;
  label: string;
  multiple?: boolean;
  counts?: { photos: string; videos?: string; miniclips?: string };
  onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const summary = useMemo(() => [counts?.photos, counts?.videos, counts?.miniclips].filter(Boolean).join(" · "), [counts]);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Button type="button" onClick={() => input.current?.click()} className="bg-oju-verde text-oju-branco"><UploadCloud className="mr-2 h-4 w-4" />{label}</Button>
        {summary ? <p className="mt-2 text-xs font-semibold text-oju-terra-suave">{summary}</p> : null}
      </div>
      <input ref={input} type="file" accept={accept} multiple={multiple} className="hidden" onChange={event => { onFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
    </div>
  );
}
