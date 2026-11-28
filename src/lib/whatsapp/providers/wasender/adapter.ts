import type { MessageStatus, WhatsAppConnectionStatus } from "@prisma/client";
import type {
  ConnectionCredentials,
  NormalizedEvent,
  Provider,
  ProviderCapabilities,
  ProviderConnectionState,
  SendResult,
} from "../../types";
import { extractData, extractMessage, wasenderDecryptMedia, wasenderRequest, wasenderUploadMedia, WasenderError } from "./client";
import { extractSessionStatus, mapWasenderSessionStatus } from "./mapper";
import { createWasenderSession, deleteWasenderSession, getWasenderQrSession, regenerateWasenderQr } from "./sessions";
import { normalizeWasenderWebhook, verifyWasenderSignature } from "./webhook";

const capabilities: ProviderCapabilities = {
  text: true,
  image: true,
  video: true,
  audio: true,
  document: true,
  status: true,
  verify: true,
  webhook: true,
};

async function readState(credentials: ConnectionCredentials): Promise<ProviderConnectionState> {
  const statusBody = await wasenderRequest(credentials, "/api/status");
  const rawStatus = extractSessionStatus(statusBody) ?? "disconnected";
  let phone: string | null = null;
  let displayName: string | null = null;
  try {
    const userBody = await wasenderRequest(credentials, "/api/user");
    const data = extractData(userBody);
    if (data) {
      const id = typeof data.id === "string" ? data.id : "";
      phone = id.replace(/^[^0-9]*/, "").split(":")[0] || null;
      displayName = typeof data.name === "string" ? data.name : null;
    }
  } catch {
    // /api/user es opcional para el diagnóstico; no invalida la verificación.
  }
  const status: WhatsAppConnectionStatus = mapWasenderSessionStatus(rawStatus);
  return {
    status,
    providerStatus: rawStatus,
    phone,
    displayName,
    detail: status === "CONNECTED" ? "Sesión conectada" : `Estado del proveedor: ${rawStatus}`,
  };
}

async function send(credentials: ConnectionCredentials, payload: Record<string, unknown>): Promise<SendResult> {
  try {
    const body = await wasenderRequest(credentials, "/api/send-message", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = extractData(body);
    const providerMessageId = data && (typeof data.msgId === "string" || typeof data.msgId === "number")
      ? String(data.msgId)
      : null;
    const providerStatus = data && typeof data.status === "string" ? data.status : null;
    return {
      providerMessageId,
      accepted: true,
      providerStatus,
      // La respuesta aceptada no significa entrega; se considera "en proceso" hasta el webhook.
      uncertain: false,
    };
  } catch (error) {
    // Timeout/red: la API pudo aceptar el mensaje. No reintentar ciegamente.
    const uncertain = error instanceof WasenderError && error.status === 0;
    throw Object.assign(error instanceof Error ? error : new Error("Error al enviar"), { uncertain });
  }
}

/** Descarga el archivo desencriptado y valida que sea una imagen razonable. */
async function fetchDecryptedBytes(url: string, fallbackMime?: string | null): Promise<{ bytes: Buffer; mimeType: string }> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new WasenderError(`No se pudo descargar el archivo desencriptado (HTTP ${response.status})`, 502, true);
  let mimeType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0].trim();
  if (!mimeType.startsWith("image/") && fallbackMime?.startsWith("image/")) mimeType = fallbackMime;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!mimeType.startsWith("image/")) throw new WasenderError("El archivo recibido no es una imagen", 400, false);
  if (bytes.length > 16 * 1024 * 1024) throw new WasenderError("La imagen supera el límite de 16 MB", 400, false);
  return { bytes, mimeType };
}

export const wasenderProvider: Provider = {
  kind: "WASENDER",
  label: "WasenderAPI",
  available: true,
  capabilities,
  createSession: (input) => createWasenderSession(input),
  getQrSession: (externalId) => getWasenderQrSession(externalId),
  regenerateQr: (externalId) => regenerateWasenderQr(externalId),
  deleteSession: (externalId) => deleteWasenderSession(externalId),
  verifyCredentials: readState,
  getConnectionState: readState,
  sendText: (credentials, to, text) => send(credentials, { to, text }),
  sendImage: (credentials, to, imageUrl, caption) => send(credentials, { to, text: caption, imageUrl }),
  sendVideo: (credentials, to, videoUrl, caption) => send(credentials, { to, text: caption, videoUrl }),
  sendAudio: (credentials, to, audioUrl) => send(credentials, { to, audioUrl }),
  sendDocument: (credentials, to, documentUrl, fileName) => send(credentials, { to, documentUrl, fileName }),
  decryptMedia: async (credentials, input) => {
    const media = input.media;
    if (!media.url || !media.mediaKey) return null;
    const mediaObject: Record<string, unknown> = {
      url: media.url,
      mimetype: media.mimetype ?? "application/octet-stream",
      mediaKey: media.mediaKey,
    };
    if (media.fileSha256) mediaObject.fileSha256 = media.fileSha256;
    if (media.fileLength !== null) mediaObject.fileLength = media.fileLength;
    if (media.fileName) mediaObject.fileName = media.fileName;
    const publicUrl = await wasenderDecryptMedia(credentials, {
      data: { messages: { key: { id: input.messageId }, message: { [`${media.type}Message`]: mediaObject } } },
    });
    if (!publicUrl) return null;
    return fetchDecryptedBytes(publicUrl, media.mimetype);
  },
  uploadMedia: (credentials, input) => wasenderUploadMedia(credentials, input),
  verifyWebhook: (signature, secret) => verifyWasenderSignature(signature, secret),
  normalizeWebhook: (payload: unknown): NormalizedEvent[] => normalizeWasenderWebhook(payload),
  providerErrorCode(error: unknown) {
    if (error instanceof WasenderError) return `wasender_http_${error.status || "network"}`;
    return "unknown";
  },
};

export function mapProviderMessageStatus(raw: string | number): MessageStatus {
  const code = typeof raw === "number" ? raw : Number(raw);
  if (code === 0) return "FAILED";
  if (code === 1) return "PENDING";
  if (code === 2) return "SENT";
  if (code === 3) return "DELIVERED";
  if (code === 4 || code === 5) return "READ";
  return "ACCEPTED";
}

export { extractMessage };
