export function isJpegBuffer(body: Buffer) {
  return body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
}

export function isPngBuffer(body: Buffer) {
  return body.length >= 4 && body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47;
}

export function isPdfBuffer(body: Buffer) {
  return body.length >= 5 && body.subarray(0, 5).toString("ascii") === "%PDF-";
}

export type UploadKind = "foto" | "vídeo" | "documento";

export function classifyUploadFile(contentType: string, body: Buffer): { kind: UploadKind } | { error: string } {
  const type = contentType.toLowerCase().split(";")[0].trim();
  if (!body.length) return { error: "Selecione um arquivo válido." };
  if (type === "application/pdf") {
    if (!isPdfBuffer(body)) return { error: "O PDF não é um arquivo PDF verdadeiro." };
    return { kind: "documento" };
  }
  if (type.startsWith("image/")) {
    if (type !== "image/jpeg" && type !== "image/jpg") return { error: "Fotografia aceita somente JPEG." };
    if (isPngBuffer(body) || isPdfBuffer(body)) return { error: "Arquivo disfarçado. Envie um JPEG verdadeiro." };
    if (!isJpegBuffer(body)) return { error: "A fotografia não é um JPEG verdadeiro." };
    return { kind: "foto" };
  }
  if (type.startsWith("video/")) {
    if (isJpegBuffer(body) || isPngBuffer(body) || isPdfBuffer(body)) return { error: "Arquivo incompatível com vídeo." };
    return { kind: "vídeo" };
  }
  return { error: "Tipo de arquivo não permitido." };
}

export function isOverWindowLimit(count: number, max: number) {
  return count >= max;
}

export type StorageQuotaPolicy = {
  userAlertBytes: number;
  userBlockBytes: number;
  globalAlertBytes: number;
  globalBlockBytes: number;
  userUploadsPerWindow: number;
  globalUploadsPerWindow: number;
  windowMinutes: number;
};

export const DEFAULT_STORAGE_QUOTA: StorageQuotaPolicy = {
  userAlertBytes: 2 * 1024 * 1024 * 1024,
  userBlockBytes: 8 * 1024 * 1024 * 1024,
  globalAlertBytes: 40 * 1024 * 1024 * 1024,
  globalBlockBytes: 200 * 1024 * 1024 * 1024,
  userUploadsPerWindow: 20,
  globalUploadsPerWindow: 80,
  windowMinutes: 15,
};

export function parseStorageQuotaPolicy(raw: string | null | undefined): StorageQuotaPolicy {
  if (!raw) return { ...DEFAULT_STORAGE_QUOTA };
  try {
    const parsed = JSON.parse(raw) as Partial<StorageQuotaPolicy>;
    return {
      userAlertBytes: Number(parsed.userAlertBytes) > 0 ? Number(parsed.userAlertBytes) : DEFAULT_STORAGE_QUOTA.userAlertBytes,
      userBlockBytes: Number(parsed.userBlockBytes) > 0 ? Number(parsed.userBlockBytes) : DEFAULT_STORAGE_QUOTA.userBlockBytes,
      globalAlertBytes: Number(parsed.globalAlertBytes) > 0 ? Number(parsed.globalAlertBytes) : DEFAULT_STORAGE_QUOTA.globalAlertBytes,
      globalBlockBytes: Number(parsed.globalBlockBytes) > 0 ? Number(parsed.globalBlockBytes) : DEFAULT_STORAGE_QUOTA.globalBlockBytes,
      userUploadsPerWindow: Number(parsed.userUploadsPerWindow) > 0 ? Number(parsed.userUploadsPerWindow) : DEFAULT_STORAGE_QUOTA.userUploadsPerWindow,
      globalUploadsPerWindow: Number(parsed.globalUploadsPerWindow) > 0 ? Number(parsed.globalUploadsPerWindow) : DEFAULT_STORAGE_QUOTA.globalUploadsPerWindow,
      windowMinutes: Number(parsed.windowMinutes) > 0 ? Number(parsed.windowMinutes) : DEFAULT_STORAGE_QUOTA.windowMinutes,
    };
  } catch {
    return { ...DEFAULT_STORAGE_QUOTA };
  }
}

export function quotaDecision(usedBytes: number, alertBytes: number, blockBytes: number): "ok" | "alert" | "block" {
  if (usedBytes >= blockBytes) return "block";
  if (usedBytes >= alertBytes) return "alert";
  return "ok";
}
