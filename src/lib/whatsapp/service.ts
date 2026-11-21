import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Prisma, WhatsAppConnectionStatus } from "@prisma/client";
import { assertConnectionAdmin } from "../auth/permissions";
import { getPrisma } from "../db/prisma";
import { getApiCatalogContext, requireCatalogContext } from "../catalog/service";
import type { CatalogActor } from "../catalog/service";
import { decryptSecret, encryptSecret } from "./crypto";
import { getProvider, listProviders, requireProvider } from "./registry";
import type { ConnectionCredentials } from "./types";

export class WhatsAppError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "WhatsAppError";
  }
}

export type ConnectionDTO = {
  id: string;
  provider: string;
  providerLabel: string;
  name: string;
  expectedPhone: string | null;
  verifiedPhone: string | null;
  externalSessionId: string | null;
  status: WhatsAppConnectionStatus;
  providerStatus: string | null;
  isPrimary: boolean;
  webhookUrl: string | null;
  webhookId: string;
  lastCheckedAt: string | null;
  lastError: string | null;
  available: boolean;
};

function toDTO(row: {
  id: string; provider: "WASENDER" | "META"; name: string; expectedPhone: string | null;
  externalSessionId: string | null; status: WhatsAppConnectionStatus; providerStatus: string | null;
  isPrimary: boolean; webhookId: string; lastCheckedAt: Date | null; lastError: string | null;
}): ConnectionDTO {
  const provider = getProvider(row.provider);
  const base = (process.env.WHATSAPP_WEBHOOK_BASE_URL || "").replace(/\/+$/, "");
  return {
    id: row.id,
    provider: row.provider,
    providerLabel: provider?.label ?? row.provider,
    name: row.name,
    expectedPhone: row.expectedPhone,
    verifiedPhone: null,
    externalSessionId: row.externalSessionId,
    status: row.status,
    providerStatus: row.providerStatus,
    isPrimary: row.isPrimary,
    webhookUrl: base ? `${base}/api/webhooks/whatsapp/wasender/${row.webhookId}` : null,
    webhookId: row.webhookId,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    lastError: row.lastError,
    available: provider?.available ?? false,
  };
}

export async function requireWhatsAppActor(): Promise<CatalogActor> {
  return requireCatalogContext();
}

export async function getApiWhatsAppActor(request: Request): Promise<CatalogActor> {
  return getApiCatalogContext(request);
}

export function providerCatalog() {
  return listProviders();
}

export async function listConnections(actor: CatalogActor): Promise<ConnectionDTO[]> {
  const rows = await getPrisma().whatsAppConnection.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toDTO);
}

function normalizePhone(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new WhatsAppError("Número no válido");
  return value.replace(/[\s().-]/g, "") || null;
}

function clean(value: unknown, field: string, max = 120, required = false): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw new WhatsAppError(`${field} es obligatorio`);
  if (text.length > max) throw new WhatsAppError(`${field} excede ${max} caracteres`);
  return text;
}

async function credentialsFromInput(actor: CatalogActor, input: Record<string, unknown>, existing?: { credentials: string }) {
  const providerKind = String(input.provider ?? "WASENDER");
  const provider = requireProvider(providerKind);
  if (!provider.available) throw new WhatsAppError("Proveedor no disponible");

  const current: ConnectionCredentials | null = existing
    ? JSON.parse(decryptSecret(existing.credentials)) as ConnectionCredentials
    : null;

  const apiKey = input.apiKey === undefined || input.apiKey === ""
    ? current?.apiKey ?? ""
    : clean(input.apiKey, "Session API Key", 400, true);
  const webhookSecret = input.webhookSecret === undefined || input.webhookSecret === ""
    ? current?.webhookSecret ?? ""
    : clean(input.webhookSecret, "Webhook Secret", 400, true);
  if (!apiKey) throw new WhatsAppError("La Session API Key es obligatoria");
  if (!webhookSecret) throw new WhatsAppError("El Webhook Secret es obligatorio");

  const sessionId = input.sessionId === undefined || input.sessionId === ""
    ? current?.sessionId
    : clean(input.sessionId, "Identificador de sesión", 120);

  return { provider, credentials: { apiKey, webhookSecret, sessionId } as ConnectionCredentials };
}

async function assertExternalSessionFree(actor: CatalogActor, sessionId: string | undefined, excludeId?: string) {
  if (!sessionId) return;
  const existing = await getPrisma().whatsAppConnection.findUnique({
    where: { externalSessionId: sessionId },
    select: { id: true, tenantId: true },
  });
  if (existing && existing.id !== excludeId && existing.tenantId !== actor.tenantId) {
    throw new WhatsAppError("Esa sesión externa ya está asociada a otro negocio", 409);
  }
}

export async function createConnection(actor: CatalogActor, input: Record<string, unknown>): Promise<ConnectionDTO> {
  assertConnectionAdmin(actor.role);
  const { provider, credentials } = await credentialsFromInput(actor, input);
  const sessionId = credentials.sessionId;
  await assertExternalSessionFree(actor, sessionId);
  const expectedPhone = normalizePhone(input.expectedPhone);

  const row = await getPrisma().$transaction(async (tx) => {
    const count = await tx.whatsAppConnection.count({ where: { tenantId: actor.tenantId } });
    return tx.whatsAppConnection.create({
      data: {
        tenantId: actor.tenantId,
        provider: provider.kind,
        name: clean(input.name, "Nombre de conexión", 80, true),
        expectedPhone,
        externalSessionId: sessionId || null,
        status: "PENDING",
        isPrimary: count === 0 && input.isPrimary !== false,
        credentials: encryptSecret(JSON.stringify(credentials)),
        webhookId: randomBytes(24).toString("hex"),
        webhookSecretHash: createHash("sha256").update(credentials.webhookSecret).digest("hex"),
      },
    });
  });
  return toDTO(row);
}

async function findOwnedConnection(actor: CatalogActor, id: string) {
  const row = await getPrisma().whatsAppConnection.findFirst({
    where: { id, tenantId: actor.tenantId },
  });
  if (!row) throw new WhatsAppError("Conexión no encontrada", 404);
  return row;
}

export async function updateConnection(actor: CatalogActor, id: string, input: Record<string, unknown>): Promise<ConnectionDTO> {
  assertConnectionAdmin(actor.role);
  const existing = await findOwnedConnection(actor, id);
  const { provider, credentials } = await credentialsFromInput(actor, input, existing);
  const sessionId = credentials.sessionId;
  await assertExternalSessionFree(actor, sessionId, id);

  const row = await getPrisma().whatsAppConnection.update({
    where: { id },
    data: {
      provider: provider.kind,
      name: input.name === undefined ? existing.name : clean(input.name, "Nombre de conexión", 80, true),
      expectedPhone: input.expectedPhone === undefined ? existing.expectedPhone : normalizePhone(input.expectedPhone),
      externalSessionId: sessionId || null,
      credentials: encryptSecret(JSON.stringify(credentials)),
      webhookSecretHash: createHash("sha256").update(credentials.webhookSecret).digest("hex"),
      status: "PENDING",
    },
  });
  return toDTO(row);
}

/** Guarda y verifica realmente contra el proveedor. Nunca marca conectada solo por guardar. */
export async function verifyConnection(actor: CatalogActor, id: string): Promise<ConnectionDTO> {
  assertConnectionAdmin(actor.role);
  const row = await findOwnedConnection(actor, id);
  const provider = requireProvider(row.provider);
  const credentials = JSON.parse(decryptSecret(row.credentials)) as ConnectionCredentials;

  try {
    const state = await provider.verifyCredentials(credentials);
    const verifiedPhone = state.phone ?? row.expectedPhone;
    if (state.phone && row.expectedPhone && normalized(state.phone) !== normalized(row.expectedPhone)) {
      throw new WhatsAppError("El número verificado no coincide con el número esperado", 409);
    }
    const updated = await getPrisma().whatsAppConnection.update({
      where: { id },
      data: {
        status: state.status,
        providerStatus: state.providerStatus,
        expectedPhone: row.expectedPhone ?? verifiedPhone,
        externalSessionId: row.externalSessionId ?? credentials.sessionId ?? null,
        lastCheckedAt: new Date(),
        lastError: null,
      },
    });
    return { ...toDTO(updated), verifiedPhone: state.phone };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Error al verificar";
    await getPrisma().whatsAppConnection.update({
      where: { id },
      data: {
        status: error instanceof WhatsAppError ? row.status : "ERROR",
        providerStatus: null,
        lastCheckedAt: new Date(),
        lastError: message,
      },
    });
    if (error instanceof WhatsAppError) throw error;
    throw new WhatsAppError(`No se pudo verificar: ${message}`, 502);
  }
}

function normalized(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export async function disconnectConnection(actor: CatalogActor, id: string): Promise<ConnectionDTO> {
  assertConnectionAdmin(actor.role);
  await findOwnedConnection(actor, id);
  const row = await getPrisma().whatsAppConnection.update({
    where: { id },
    data: { status: "DISCONNECTED", providerStatus: null, lastCheckedAt: new Date() },
  });
  return toDTO(row);
}

export async function getConnectionByWebhookId(webhookId: string) {
  return getPrisma().whatsAppConnection.findUnique({ where: { webhookId } });
}

export function getConnectionCredentials(row: { credentials: string; provider: "WASENDER" | "META" }): ConnectionCredentials {
  return JSON.parse(decryptSecret(row.credentials)) as ConnectionCredentials;
}

export function getConnectionProvider(row: { provider: "WASENDER" | "META" }) {
  return requireProvider(row.provider);
}

export async function hasPrimaryConnection(tenantId: string) {
  const count = await getPrisma().whatsAppConnection.count({
    where: { tenantId, isPrimary: true, status: "CONNECTED" },
  });
  return count > 0;
}

/** Expone solo DTOs al navegador; nunca credenciales. */
export async function getInboxConnectionStatus(actor: CatalogActor) {
  const rows = await listConnections(actor);
  const primary = rows.find((row) => row.isPrimary) ?? rows[0] ?? null;
  return {
    hasConfiguredConnection: rows.length > 0,
    status: primary?.status ?? "NOT_CONFIGURED",
    provider: primary?.providerLabel ?? null,
    verified: primary?.status === "CONNECTED",
  };
}

export type { CatalogActor, Prisma };
