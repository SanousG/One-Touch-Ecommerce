import { secretsEqual } from "../../crypto";
import type { NormalizedEvent } from "../../types";
import { mapWasenderMessage, mapWasenderSessionStatus, mapWasenderStatus } from "./mapper";

/** Wasender usa comparación directa del header con el Webhook Secret (no HMAC). */
export function verifyWasenderSignature(signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  return secretsEqual(signature, secret);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * Normaliza el payload sin conservar sessionId/API keys. Los campos sensibles
 * del proveedor se descartan aquí, antes de persistir cualquier cosa.
 */
export function normalizeWasenderWebhook(payload: unknown): NormalizedEvent[] {
  const body = asRecord(payload);
  if (!body) return [{ type: "ignored", reason: "payload inválido" }];
  const event = typeof body.event === "string" ? body.event : "";
  const data = asRecord(body.data) ?? {};

  if (event === "messages.received" || event === "messages.upsert" || event === "personal-message.received") {
    const raw = data.messages;
    const list = Array.isArray(raw) ? raw : [raw];
    return list.flatMap((item) => mapWasenderMessage(item, event));
  }
  if (event === "message.sent") {
    // {"key":{...},"message":{...},"success":true|false} — sin campo update/status.
    const source = asRecord(data.key) ? data : (asRecord(data.message) ?? data);
    const mapped = mapWasenderStatus(source, data.success === true ? 2 : 0);
    return mapped ? [mapped] : [{ type: "ignored", reason: "message.sent sin clave" }];
  }
  if (event === "messages.update" || event === "message-receipt.update") {
    // messages.update trae {update, key}; receipt trae {message:{key, receipt}}.
    const source = event === "messages.update" ? data : (asRecord(data.message) ?? data);
    const mapped = mapWasenderStatus(source);
    return mapped ? [mapped] : [{ type: "ignored", reason: `evento ${event} sin clave` }];
  }
  if (event === "session.status") {
    const status = typeof data.status === "string" ? data.status : "";
    return status
      ? [{ type: "session", status: mapWasenderSessionStatus(status), providerStatus: status }]
      : [{ type: "ignored", reason: "session.status sin estado" }];
  }
  return [{ type: "ignored", reason: `evento no soportado: ${event.slice(0, 48)}` }];
}

/** Sanitiza el payload para almacenamiento durable: quita credenciales y datos sensibles. */
export function sanitizePayload(payload: unknown): Record<string, unknown> {
  const body = asRecord(payload) ?? {};
  const result: Record<string, unknown> = {};
  if (typeof body.event === "string") result.event = body.event.slice(0, 80);
  if (typeof body.timestamp === "number" || typeof body.timestamp === "string") result.timestamp = body.timestamp;
  const data = asRecord(body.data) ?? {};
  const safeData: Record<string, unknown> = {};
  if (typeof data.status === "string") safeData.status = data.status;
  if (typeof data.success === "boolean") safeData.success = data.success;
  const messages = data.messages;
  if (messages) {
    const items = Array.isArray(messages) ? messages : [messages];
    safeData.messages = items.map((item) => {
      const msg = asRecord(item) ?? {};
      const key = asRecord(msg.key) ?? {};
      return {
        key: {
          id: typeof key.id === "string" ? key.id.slice(0, 120) : null,
          fromMe: key.fromMe === true,
          addressingMode: typeof key.addressingMode === "string" ? key.addressingMode : null,
          remoteJidPresent: Boolean(key.remoteJid),
        },
        hasBody: Boolean(msg.messageBody),
        hasMedia: Boolean(asRecord(msg.message)?.imageMessage ?? asRecord(msg.message)?.videoMessage
          ?? asRecord(msg.message)?.audioMessage ?? asRecord(msg.message)?.documentMessage
          ?? asRecord(msg.message)?.stickerMessage),
        // Nunca se persiste mediaKey (clave de desencriptado): es un secreto del proveedor.
      };
    });
  }
  const update = asRecord(data.update);
  if (update) safeData.update = { status: update.status ?? null };
  result.data = safeData;
  return result;
}
