import type { MessageStatus, WhatsAppConnectionStatus } from "@prisma/client";
import type {
  ConnectionCredentials,
  NormalizedEvent,
  Provider,
  ProviderCapabilities,
  ProviderConnectionState,
  SendResult,
} from "../../types";
import { extractData, extractMessage, wasenderRequest, WasenderError } from "./client";
import { extractSessionStatus, mapWasenderSessionStatus } from "./mapper";
import { normalizeWasenderWebhook, verifyWasenderSignature } from "./webhook";

const capabilities: ProviderCapabilities = {
  text: true,
  image: true,
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

export const wasenderProvider: Provider = {
  kind: "WASENDER",
  label: "WasenderAPI",
  available: true,
  capabilities,
  verifyCredentials: readState,
  getConnectionState: readState,
  sendText: (credentials, to, text) => send(credentials, { to, text }),
  sendImage: (credentials, to, imageUrl, caption) => send(credentials, { to, text: caption, imageUrl }),
  sendDocument: (credentials, to, documentUrl, fileName) => send(credentials, { to, documentUrl, fileName }),
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
