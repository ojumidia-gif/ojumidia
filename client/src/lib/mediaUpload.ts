export type MediaUploadResult = {
  uploadId: string;
  url: string;
  key: string;
  assetUrl?: string;
  storageKey?: string;
  filename?: string;
  size?: number;
  durationSeconds?: number;
  checksum?: string;
  status?: string;
  reused?: boolean;
  message?: string;
};

export type UploadKind = "foto" | "vídeo" | "miniclipe";

export function uploadMediaFile(
  file: File,
  context?: { partnerId?: number | null; territoryId?: number | null; uploadId?: string },
  onProgress?: (percent: number) => void,
): Promise<MediaUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/upload");
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-file-name", file.name);
    if (context?.uploadId) xhr.setRequestHeader("x-upload-id", context.uploadId);
    if (context?.partnerId) xhr.setRequestHeader("x-partner-id", String(context.partnerId));
    if (context?.territoryId) xhr.setRequestHeader("x-territory-id", String(context.territoryId));
    xhr.upload.onprogress = event => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let payload: MediaUploadResult;
      try {
        payload = JSON.parse(xhr.responseText) as MediaUploadResult;
      } catch {
        reject(new Error(xhr.status === 413 ? "O arquivo ultrapassa o limite de 64 MB." : "O servidor não devolveu uma resposta de upload válida."));
        return;
      }
      const url = payload.url || payload.assetUrl || "";
      const key = payload.key || payload.storageKey || "";
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(payload.message || "O envio não foi concluído."));
        return;
      }
      if (!url || !key || !payload.uploadId) {
        reject(new Error("O servidor não retornou os dados necessários do upload."));
        return;
      }
      resolve({ ...payload, url, key });
    };
    xhr.onerror = () => reject(new Error("Falha de rede no envio. Verifique a conexão e tente novamente."));
    xhr.onabort = () => reject(new Error("O envio foi interrompido."));
    xhr.send(file);
  });
}
