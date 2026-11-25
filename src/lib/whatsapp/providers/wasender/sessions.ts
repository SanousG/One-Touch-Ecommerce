import type { CreatedSession, QrSessionState } from "../../types";
import { extractData, wasenderAdminRequest, WasenderError } from "./client";
import { mapWasenderSessionStatus } from "./mapper";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/** Wasender puede devolver el QR con distintos nombres de clave; se normalizan todos. */
export function extractQrCode(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): string | null => {
    if (!node || depth > 6 || seen.has(node)) return null;
    if (typeof node !== "object") return null;
    seen.add(node);
    const obj = record(node)!;
    for (const key of ["qrCode", "qr_code", "qrcode", "qr", "code"]) {
      const candidate = obj[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    for (const child of Object.values(obj)) {
      const found = walk(child, depth + 1);
      if (found) return found;
    }
    return null;
  };
  return walk(value, 0);
}

function sessionFromBody(body: unknown): CreatedSession | null {
  const data = extractData(body) ?? record(body);
  if (!data) return null;
  const rawId = data.id ?? data.session_id ?? data.whatsappSession;
  const apiKey = data.api_key ?? data.apiKey;
  const webhookSecret = data.webhook_secret ?? data.webhookSecret;
  if (rawId === undefined || rawId === null || typeof apiKey !== "string" || !apiKey) return null;
  if (typeof webhookSecret !== "string" || !webhookSecret) return null;
  const providerStatus = typeof data.status === "string" ? data.status : "connecting";
  const phone = typeof data.phone_number === "string" ? data.phone_number : null;

  // La API de creación no siempre devuelve el QR; se obtiene justo después vía connect/qrcode.
  return {
    externalId: String(rawId),
    credentials: { apiKey, webhookSecret, sessionId: String(rawId) },
    phone,
    providerStatus,
    qrCode: extractQrCode(data),
  };
}

export async function createWasenderSession(input: {
  name: string;
  phoneNumber: string;
  webhookUrl: string;
}): Promise<CreatedSession> {
  const body = await wasenderAdminRequest("/api/whatsapp-sessions", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      phone_number: input.phoneNumber,
      account_protection: false,
      log_messages: true,
      webhook_enabled: true,
      webhook_url: input.webhookUrl,
      webhook_events: ["messages.received", "message.sent", "messages.upsert", "messages.update", "session.status"],
      ignore_groups: true,
      ignore_channels: true,
      read_incoming_messages: false,
    }),
  });
  const session = sessionFromBody(body);
  if (!session) throw new WasenderError("WasenderAPI no devolvió los datos de la sesión creada", 502, false);

  if (!session.qrCode) {
    session.qrCode = await connectAndReadQr(session.externalId);
  }
  return session;
}

/** Inicializa la sesión y obtiene el QR. Tolerante a variaciones del proveedor. */
export async function connectAndReadQr(externalId: string): Promise<string | null> {
  let qr: string | null = null;
  try {
    const connected = await wasenderAdminRequest(`/api/whatsapp-sessions/${encodeURIComponent(externalId)}/connect`, {
      method: "POST",
    });
    qr = extractQrCode(connected);
  } catch {
    // Algunas despliegues devuelven 404/405 aquí; se intenta el endpoint de QR.
  }
  if (!qr) {
    for (const path of ["qrcode", "qr-code", "qr"]) {
      try {
        const body = await wasenderAdminRequest(`/api/whatsapp-sessions/${encodeURIComponent(externalId)}/${path}`);
        qr = extractQrCode(body);
        if (qr) break;
      } catch {
        // Probar la siguiente variante.
      }
    }
  }
  return qr;
}

/** Elimina la sesión en WasenderAPI. Responde 204 cuando tiene éxito. */
export async function deleteWasenderSession(externalId: string): Promise<void> {
  await wasenderAdminRequest(`/api/whatsapp-sessions/${encodeURIComponent(externalId)}`, { method: "DELETE" });
}

/**
 * Obtiene el QR vigente de una sesión pendiente de vinculación. El QR rota solo
 * cuando expiera; `connect` reinicializa el emparejamiento y lo devuelve. Si la
 * sesión ya está conectada se señala con 409 para sincronizar el estado local.
 */
export async function regenerateWasenderQr(externalId: string): Promise<string> {
  const current = await getWasenderQrSession(externalId);
  if (current.status === "CONNECTED") {
    throw new WasenderError("La sesión ya está vinculada en WasenderAPI; no necesita un QR nuevo", 409, false);
  }
  // Wasender solo permite `restart` en sesiones CONECTADAS (en need_scan responde
  // "WhatsApp session is not connected. Cannot restart."). Para sesiones pendientes
  // de escaneo, `connect` reinicializa el emparejamiento y entrega el QR vigente,
  // que rota automáticamente cuando expira.
  const qr = (await connectAndReadQr(externalId)) ?? current.qrCode;
  if (!qr) {
    throw new WasenderError("WasenderAPI no devolvió un QR. Intente nuevamente en unos segundos.", 502, false);
  }
  return qr;
}

export async function getWasenderQrSession(externalId: string): Promise<QrSessionState> {
  const body = await wasenderAdminRequest(`/api/whatsapp-sessions/${encodeURIComponent(externalId)}`);
  const data = extractData(body) ?? record(body) ?? {};
  const providerStatus = typeof data.status === "string" ? data.status : "connecting";
  const phone = typeof data.phone_number === "string" ? data.phone_number : null;
  let qrCode = extractQrCode(data);
  if (!qrCode && mapWasenderSessionStatus(providerStatus) !== "CONNECTED") {
    qrCode = await connectAndReadQr(externalId);
  }
  return {
    status: mapWasenderSessionStatus(providerStatus),
    providerStatus,
    phone,
    qrCode,
  };
}
