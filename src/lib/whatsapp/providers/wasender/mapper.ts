import type { MessageKind, MessageStatus, WhatsAppConnectionStatus } from "@prisma/client";
import type { IncomingMedia, NormalizedEvent } from "../../types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function detectKind(message: Record<string, unknown>): MessageKind {
  const keys = ["imageMessage", "documentMessage", "audioMessage", "videoMessage", "stickerMessage", "locationMessage", "contactMessage"];
  for (const key of keys) if (message[key]) {
    if (key === "imageMessage") return "IMAGE";
    if (key === "documentMessage") return "DOCUMENT";
    if (key === "audioMessage") return "AUDIO";
    if (key === "videoMessage") return "VIDEO";
    if (key === "stickerMessage") return "STICKER";
    if (key === "locationMessage") return "LOCATION";
    return "CONTACT";
  }
  return typeof message.conversation === "string" || typeof message.extendedTextMessage === "object" ? "TEXT" : "UNKNOWN";
}

const MEDIA_KEYS: Array<[string, IncomingMedia["type"]]> = [
  ["imageMessage", "image"],
  ["videoMessage", "video"],
  ["audioMessage", "audio"],
  ["documentMessage", "document"],
  ["stickerMessage", "sticker"],
];

/** Extrae la información cifrada del primer archivo presente en el mensaje. */
function extractMedia(message: Record<string, unknown>, body: string): IncomingMedia | undefined {
  for (const [key, type] of MEDIA_KEYS) {
    const raw = asRecord(message[key]);
    if (!raw) continue;
    const url = text(raw.url);
    if (!url) continue;
    const fileLength = raw.fileLength;
    return {
      type,
      url,
      mimetype: text(raw.mimetype),
      mediaKey: text(raw.mediaKey),
      fileSha256: text(raw.fileSha256),
      fileLength: typeof fileLength === "number" ? fileLength
        : typeof fileLength === "string" && Number.isFinite(Number(fileLength)) ? Number(fileLength) : null,
      fileName: text(raw.fileName),
      caption: text(raw.caption) ?? (body || null),
    };
  }
  return undefined;
}

function toDate(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value > 1e12 ? value : value * 1000);
  }
  return null;
}

/** Mapea cualquier mensaje normalizado de Wasender a eventos internos. */
export function mapWasenderMessage(raw: unknown, eventName: string): NormalizedEvent[] {
  const record = asRecord(raw);
  if (!record) return [{ type: "ignored", reason: "mensaje sin estructura" }];
  const key = asRecord(record.key) ?? {};
  const id = text(key.id);
  const remoteJid = text(key.remoteJid);
  if (!id || !remoteJid) return [{ type: "ignored", reason: "mensaje sin id o remoteJid" }];

  // Ignorar grupos, canales, estados y broadcasts: la bandeja atiende chats individuales.
  if (/@(g\.us|newsletter|broadcast)$/.test(remoteJid) || remoteJid === "status@broadcast") {
    return [{ type: "ignored", reason: "chat no individual" }];
  }
  if (eventName === "messages.received" && key.fromMe === true) {
    return [{ type: "ignored", reason: "mensaje propio" }];
  }

  const message = asRecord(record.message) ?? {};
  const body = text(record.messageBody) ?? (typeof message.conversation === "string" ? message.conversation : "");

  return [{
    type: "message",
    externalId: id,
    fromMe: key.fromMe === true,
    remoteJid,
    phone: text(key.cleanedSenderPn) ?? text(key.senderPn),
    lid: text(key.senderLid) ?? (remoteJid.endsWith("@lid") ? remoteJid : null),
    addressingMode: text(key.addressingMode),
    body,
    kind: detectKind(message),
    media: extractMedia(message, body),
    eventAt: toDate(record.messageTimestamp) ?? toDate(record.timestamp),
  }];
}

export function mapWasenderStatus(raw: unknown, fallbackCode?: number): NormalizedEvent | null {
  const record = asRecord(raw);
  if (!record) return null;
  const key = asRecord(record.key);
  const id = key && text(key.id);
  if (!id) return null;
  const update = asRecord(record.update);
  const rawStatus = update ? update.status : (record as Record<string, unknown>).status ?? fallbackCode;
  const code = typeof rawStatus === "number" ? rawStatus : Number(rawStatus);
  const status: MessageStatus =
    code === 0 ? "FAILED" :
    code === 1 ? "PENDING" :
    code === 2 ? "SENT" :
    code === 3 ? "DELIVERED" :
    code === 4 ? "READ" :
    code === 5 ? "READ" : "ACCEPTED";
  return {
    type: "status",
    externalId: id,
    status,
    providerStatus: String(code),
  };
}

export function mapWasenderSessionStatus(rawStatus: string): WhatsAppConnectionStatus {
  switch (rawStatus) {
    case "connected": return "CONNECTED";
    case "connecting": return "CONNECTING";
    case "need_scan":
    case "need_passkey": return "NEEDS_LINKING";
    case "disconnected": return "DISCONNECTED";
    case "logged_out":
    case "expired": return "ERROR";
    default: return "PENDING";
  }
}

/** Estado del endpoint GET /api/status (puede venir como {status} o {data:{status}}). */
export function extractSessionStatus(body: unknown): string | null {
  const record = asRecord(body);
  if (!record) return null;
  const direct = text(record.status);
  if (direct) return direct;
  const data = asRecord(record.data);
  return data ? text(data.status) : null;
}
