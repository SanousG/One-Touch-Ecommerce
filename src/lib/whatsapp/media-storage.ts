import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { downloadFromDrive, driveFileId, isDriveKey, uploadToDrive } from "../storage/google-drive";

/** Directorio privado (volumen Docker) donde se guardan las fotos de la bandeja. */
function baseDir(): string {
  return (process.env.WHATSAPP_MEDIA_DIR || "/app/storage/whatsapp-media").replace(/\/+$/, "");
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120) || "unknown";
}

export function extensionForMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/aac": "aac",
    "audio/ogg": "ogg",
    "audio/amr": "amr",
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/wav": "wav",
  };
  return map[mime.split(";")[0].trim().toLowerCase()] ?? "bin";
}

/** Guarda los bytes y devuelve la ruta relativa que se persiste en ConversationMessage.media. */
export async function saveWhatsappImage(
  tenantId: string,
  messageId: string,
  bytes: Buffer,
  mimeType: string,
): Promise<string> {
  const fileName = `${safeSegment(messageId)}.${extensionForMime(mimeType)}`;
  const uploaded = await uploadToDrive({
    bytes,
    fileName,
    mimeType,
    folderSegments: ["WhatsApp", safeSegment(tenantId)],
  });
  return `drive:${uploaded.fileId}`;
}

/** Lee una imagen guardada. Rechaza rutas que intenten salir del directorio base. */
export async function readWhatsappImage(relative: string): Promise<{ bytes: Buffer; mimeType: string } | null> {
  if (isDriveKey(relative)) {
    try {
      return await downloadFromDrive(driveFileId(relative));
    } catch {
      return null;
    }
  }
  if (!relative || relative.includes("..") || path.isAbsolute(relative)) return null;
  const base = path.resolve(baseDir());
  const absolute = path.resolve(/*turbopackIgnore: true*/ base, relative);
  if (!absolute.startsWith(base + path.sep)) return null;
  const ext = path.extname(absolute).slice(1).toLowerCase();
  const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "png" ? "image/png"
    : ext === "webp" ? "image/webp"
    : ext === "gif" ? "image/gif" : "application/octet-stream";
  try {
    return { bytes: await readFile(absolute), mimeType };
  } catch {
    return null;
  }
}
