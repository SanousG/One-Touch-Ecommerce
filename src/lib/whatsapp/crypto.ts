import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

const PREFIX = "v1";

function masterKey(): Buffer {
  const raw = process.env.WHATSAPP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("Falta WHATSAPP_ENCRYPTION_KEY (base64 de 32 bytes)");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("WHATSAPP_ENCRYPTION_KEY debe decodificar a 32 bytes (AES-256)");
  }
  return key;
}

/** Cifrado autenticado AES-256-GCM con nonce individual y formato versionado. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split(":");
  if (version !== PREFIX || !ivPart || !tagPart || !dataPart) {
    throw new Error("Formato de credencial cifrada no válido");
  }
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivPart, "base64"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64")), decipher.final()]).toString("utf8");
}

/** Comparación de secretos en tiempo constante (Wasender usa comparación directa). */
export function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
