import type { MessageKind, MessageStatus, WhatsAppConnectionStatus, WhatsAppProviderKind } from "@prisma/client";

export type ProviderKind = WhatsAppProviderKind;

export type ConnectionCredentials = {
  apiKey: string;
  webhookSecret: string;
  sessionId?: string;
};

export type ProviderCapabilities = {
  text: boolean;
  image: boolean;
  document: boolean;
  status: boolean;
  verify: boolean;
  webhook: boolean;
};

export type ProviderConnectionState = {
  status: WhatsAppConnectionStatus;
  providerStatus: string | null;
  phone: string | null;
  displayName: string | null;
  detail: string | null;
};

export type SendResult = {
  providerMessageId: string | null;
  accepted: boolean;
  providerStatus: string | null;
  uncertain: boolean;
};

/** Datos cifrados de un archivo recibido; se entregan al proveedor para desencriptar. */
export type IncomingMedia = {
  type: "image" | "video" | "audio" | "document" | "sticker";
  url: string;
  mimetype: string | null;
  mediaKey: string | null;
  fileSha256: string | null;
  fileLength: number | null;
  fileName: string | null;
  caption: string | null;
};

export type NormalizedMessage = {
  type: "message";
  externalId: string;
  fromMe: boolean;
  remoteJid: string;
  phone: string | null;
  lid: string | null;
  addressingMode: string | null;
  body: string;
  kind: MessageKind;
  media?: IncomingMedia;
  eventAt: Date | null;
};

export type NormalizedStatus = {
  type: "status";
  externalId: string;
  status: MessageStatus;
  providerStatus: string;
};

export type NormalizedSession = {
  type: "session";
  status: WhatsAppConnectionStatus;
  providerStatus: string;
};

export type NormalizedEvent = NormalizedMessage | NormalizedStatus | NormalizedSession | { type: "ignored"; reason: string };

/** Resultado de crear una sesión cuyo QR debe escanear el usuario. */
export type CreatedSession = {
  externalId: string;
  credentials: ConnectionCredentials;
  phone: string | null;
  providerStatus: string;
  qrCode: string | null;
};

/** Estado leído del proveedor durante el vínculo por QR. */
export type QrSessionState = {
  status: WhatsAppConnectionStatus;
  providerStatus: string;
  phone: string | null;
  qrCode: string | null;
};

export type Provider = {
  kind: ProviderKind;
  label: string;
  available: boolean;
  capabilities: ProviderCapabilities;
  /** Opcional: solo proveedores que permiten crear sesiones desde la app. */
  createSession?: (input: { name: string; phoneNumber: string; webhookUrl: string }) => Promise<CreatedSession>;
  getQrSession?: (externalId: string) => Promise<QrSessionState>;
  /** Opcional: genera un QR nuevo cuando el anterior venció. */
  regenerateQr?: (externalId: string) => Promise<string>;
  /** Opcional: elimina la sesión en el proveedor al borrar la conexión local. */
  deleteSession?: (externalId: string) => Promise<void>;
  verifyCredentials(credentials: ConnectionCredentials): Promise<ProviderConnectionState>;
  getConnectionState(credentials: ConnectionCredentials): Promise<ProviderConnectionState>;
  sendText(credentials: ConnectionCredentials, to: string, text: string): Promise<SendResult>;
  sendImage(credentials: ConnectionCredentials, to: string, imageUrl: string, caption?: string): Promise<SendResult>;
  sendDocument(credentials: ConnectionCredentials, to: string, documentUrl: string, fileName?: string): Promise<SendResult>;
  /** Descarga y desencripta un archivo recibido. Devuelve bytes y MIME type. */
  decryptMedia?: (credentials: ConnectionCredentials, input: { messageId: string; media: IncomingMedia }) => Promise<{ bytes: Buffer; mimeType: string } | null>;
  /** Sube un archivo al proveedor y devuelve una URL pública temporal. */
  uploadMedia?: (credentials: ConnectionCredentials, input: { bytes: Buffer; mimeType: string; fileName: string }) => Promise<string>;
  verifyWebhook(signature: string | null, secret: string): boolean;
  normalizeWebhook(payload: unknown): NormalizedEvent[];
  providerErrorCode(error: unknown): string;
};
