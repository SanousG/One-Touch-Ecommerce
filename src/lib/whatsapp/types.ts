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

export type Provider = {
  kind: ProviderKind;
  label: string;
  available: boolean;
  capabilities: ProviderCapabilities;
  verifyCredentials(credentials: ConnectionCredentials): Promise<ProviderConnectionState>;
  getConnectionState(credentials: ConnectionCredentials): Promise<ProviderConnectionState>;
  sendText(credentials: ConnectionCredentials, to: string, text: string): Promise<SendResult>;
  sendImage(credentials: ConnectionCredentials, to: string, imageUrl: string, caption?: string): Promise<SendResult>;
  sendDocument(credentials: ConnectionCredentials, to: string, documentUrl: string, fileName?: string): Promise<SendResult>;
  verifyWebhook(signature: string | null, secret: string): boolean;
  normalizeWebhook(payload: unknown): NormalizedEvent[];
  providerErrorCode(error: unknown): string;
};
