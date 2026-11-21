import "server-only";
import { randomUUID } from "node:crypto";
import { unlinkSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class VoucherValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoucherValidationError";
  }
}

export type StoredVoucher = {
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
  ["application/pdf", "pdf"],
]);

function baseDir() {
  return process.env.VOUCHER_UPLOAD_DIR ?? "/app/storage/payment-vouchers";
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "item";
}

function validSignature(buffer: Buffer, extension: string): boolean {
  if (extension === "jpg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === "png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (extension === "webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return buffer.subarray(0, 4).toString("ascii") === "%PDF";
}

export function voucherPath(storageKey: string): string {
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(jpg|png|webp|pdf)$/.test(storageKey)) {
    throw new VoucherValidationError("Clave de comprobante no válida");
  }
  const target = path.resolve(/* turbopackIgnore: true */ baseDir(), storageKey);
  const root = path.resolve(/* turbopackIgnore: true */ baseDir()) + path.sep;
  if (!target.startsWith(root)) throw new VoucherValidationError("Ruta no válida");
  return target;
}

export async function saveVoucher(file: File, tenantId: string, orderId: string): Promise<StoredVoucher> {
  const mimeType = (file.type || "").toLowerCase();
  const extension = ALLOWED.get(mimeType);
  if (!extension) throw new VoucherValidationError("Formato no permitido. Use JPEG, PNG, WebP o PDF");
  if (file.size === 0 || file.size > MAX_BYTES) throw new VoucherValidationError("El archivo debe tener entre 1 byte y 5 MB");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validSignature(buffer, extension)) throw new VoucherValidationError("El contenido no coincide con el formato declarado");

  const storageKey = `${safeSegment(tenantId)}/${safeSegment(orderId)}-${randomUUID()}.${extension}`;
  const target = voucherPath(storageKey);
  await mkdir(/* turbopackIgnore: true */ path.dirname(target), { recursive: true });
  await writeFile(/* turbopackIgnore: true */ target, buffer, { flag: "wx" });
  return {
    storageKey,
    fileName: path.basename(file.name || "comprobante").slice(0, 120),
    mimeType,
    sizeBytes: buffer.length,
  };
}

export async function readVoucher(storageKey: string): Promise<Buffer> {
  return readFile(/* turbopackIgnore: true */ voucherPath(storageKey));
}

export function deleteVoucher(storageKey: string) {
  try {
    unlinkSync(/* turbopackIgnore: true */ voucherPath(storageKey));
  } catch {
    // El archivo ya no existe.
  }
}
