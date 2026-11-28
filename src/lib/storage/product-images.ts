import "server-only";
import { randomUUID } from "node:crypto";
import { unlinkSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { deleteFromDrive, downloadFromDrive, driveFileId, isDriveKey, uploadToDrive } from "./google-drive";

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export type StoredImage = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function baseDir(): string {
  return process.env.PRODUCT_UPLOAD_DIR ?? "/app/storage/product-images";
}

function hasValidSignature(buffer: Buffer, extension: string): boolean {
  if (extension === "jpg") return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === "png") {
    return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return (
    buffer.length > 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "item";
}

export function storedImagePath(storageKey: string): string {
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(storageKey)) {
    throw new ImageValidationError("Clave de imagen no válida");
  }
  const target = path.resolve(/* turbopackIgnore: true */ baseDir(), storageKey);
  const root = path.resolve(/* turbopackIgnore: true */ baseDir()) + path.sep;
  if (!target.startsWith(root)) throw new ImageValidationError("Ruta de imagen no válida");
  return target;
}

export async function deleteStoredImage(storageKey: string) {
  if (isDriveKey(storageKey)) {
    await deleteFromDrive(driveFileId(storageKey)).catch(() => null);
    return;
  }
  try {
    unlinkSync(/* turbopackIgnore: true */ storedImagePath(storageKey));
  } catch {
    // El archivo ya no existe; no afecta a la operación.
  }
}

export async function saveProductImage(file: File, tenantId: string, productId: string): Promise<StoredImage> {
  const mimeType = (file.type || "").toLowerCase();
  const extension = ALLOWED.get(mimeType);
  if (!extension) throw new ImageValidationError("Formato no permitido. Use JPEG, PNG o WebP");

  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new ImageValidationError("La imagen debe tener entre 1 byte y 5 MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidSignature(buffer, extension)) {
    throw new ImageValidationError("El contenido del archivo no coincide con su formato");
  }

  const fileName = `${safeSegment(productId)}-${randomUUID()}.${extension}`;
  const uploaded = await uploadToDrive({
    bytes: buffer,
    fileName,
    mimeType,
    folderSegments: ["Productos", safeSegment(tenantId)],
  });
  const storageKey = `drive:${uploaded.fileId}`;

  return {
    storageKey,
    fileName: path.basename(file.name || "imagen").slice(0, 120),
    mimeType,
    sizeBytes: buffer.length,
  };
}

const ALLOWED_VIDEO = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function hasValidVideoSignature(buffer: Buffer, extension: string): boolean {
  if (extension === "webm") {
    return buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBM";
  }
  return buffer.length > 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
}

export async function saveProductVideo(file: File, tenantId: string, productId: string): Promise<StoredImage> {
  const mimeType = (file.type || "").toLowerCase();
  const extension = ALLOWED_VIDEO.get(mimeType);
  if (!extension) throw new ImageValidationError("Formato no permitido. Use MP4, WebM o MOV");
  if (file.size === 0 || file.size > MAX_VIDEO_BYTES) {
    throw new ImageValidationError("El video debe tener entre 1 byte y 50 MB");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidVideoSignature(buffer, extension)) {
    throw new ImageValidationError("El contenido del archivo no coincide con su formato");
  }

  const fileName = `${safeSegment(productId)}-${randomUUID()}.${extension}`;
  const uploaded = await uploadToDrive({
    bytes: buffer,
    fileName,
    mimeType,
    folderSegments: ["Productos", safeSegment(tenantId), "videos"],
  });
  return {
    storageKey: `drive:${uploaded.fileId}`,
    fileName: path.basename(file.name || "video").slice(0, 120),
    mimeType,
    sizeBytes: buffer.length,
  };
}

/** Archivo subido por el usuario para una plantilla, sin productId. Se guarda en Drive. */
export async function saveTemplateMedia(file: File, tenantId: string): Promise<StoredImage> {
  const mimeType = (file.type || "").toLowerCase();
  const isVideo = mimeType.startsWith("video/");
  const extension = (isVideo ? ALLOWED_VIDEO : ALLOWED).get(mimeType);
  if (!extension) {
    throw new ImageValidationError(isVideo ? "Formato no permitido. Use MP4, WebM o MOV" : "Formato no permitido. Use JPEG, PNG o WebP");
  }
  const max = isVideo ? MAX_VIDEO_BYTES : MAX_BYTES;
  if (file.size === 0 || file.size > max) {
    throw new ImageValidationError(isVideo ? "El video debe tener entre 1 byte y 50 MB" : "La imagen debe tener entre 1 byte y 5 MB");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const valid = isVideo ? hasValidVideoSignature(buffer, extension) : hasValidSignature(buffer, extension);
  if (!valid) throw new ImageValidationError("El contenido del archivo no coincide con su formato");

  const fileName = `plantilla-${randomUUID()}.${extension}`;
  const uploaded = await uploadToDrive({
    bytes: buffer,
    fileName,
    mimeType,
    folderSegments: ["Plantillas", safeSegment(tenantId), ...(isVideo ? ["videos"] : [])],
  });
  return {
    storageKey: `drive:${uploaded.fileId}`,
    fileName: path.basename(file.name || (isVideo ? "video" : "imagen")).slice(0, 120),
    mimeType,
    sizeBytes: buffer.length,
  };
}

export async function readStoredImage(storageKey: string): Promise<Buffer> {
  if (isDriveKey(storageKey)) {
    return (await downloadFromDrive(driveFileId(storageKey))).bytes;
  }
  return readFile(/* turbopackIgnore: true */ storedImagePath(storageKey));
}
