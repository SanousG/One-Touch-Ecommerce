import "server-only";
import QRCode from "qrcode";

/**
 * Convierte el valor devuelto por Wasender a una imagen <img> usable.
 * Acepta data-URI, URL http(s), base64 puro o el texto del QR (lo más común).
 * Nada se envía a servicios externos.
 */
export async function toQrImage(value: string | null): Promise<string | null> {
  if (!value) return null;
  const text = value.trim();
  if (/^https?:\/\//i.test(text) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(text)) return text;
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(text) && text.length > 80) {
    return `data:image/png;base64,${text.replace(/\s/g, "")}`;
  }
  return QRCode.toDataURL(text, { width: 320, margin: 2, errorCorrectionLevel: "M" });
}
