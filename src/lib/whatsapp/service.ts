import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Prisma, WhatsAppConnectionStatus } from "@prisma/client";
import { assertConnectionAdmin } from "../auth/permissions";
import { getPrisma } from "../db/prisma";
import { getApiCatalogContext, requireCatalogContext } from "../catalog/service";
import type { CatalogActor } from "../catalog/service";
import { decryptSecret, encryptSecret } from "./crypto";
import { toQrImage } from "./qr-image";
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

function webhookUrlFor(webhookId: string): string | null {
  const base = (process.env.WHATSAPP_WEBHOOK_BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}/api/webhooks/whatsapp/wasender/${webhookId}` : null;
}

function toDTO(row: {
  id: string; provider: "WASENDER" | "META"; name: string; expectedPhone: string | null;
  verifiedPhone: string | null; externalSessionId: string | null; status: WhatsAppConnectionStatus; providerStatus: string | null;
  isPrimary: boolean; webhookId: string; lastCheckedAt: Date | null; lastError: string | null;
}): ConnectionDTO {
  const provider = getProvider(row.provider);
  return {
    id: row.id,
    provider: row.provider,
    providerLabel: provider?.label ?? row.provider,
    name: row.name,
    expectedPhone: row.expectedPhone,
    verifiedPhone: row.verifiedPhone,
    externalSessionId: row.externalSessionId,
    status: row.status,
    providerStatus: row.providerStatus,
    isPrimary: row.isPrimary,
    webhookUrl: webhookUrlFor(row.webhookId),
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



/**
 * Crea una sesión en WasenderAPI desde la app, guarda las credenciales devueltas
 * cifradas y devuelve el QR para que el usuario lo escanee. No pide secretos al usuario.
 */
export async function createConnectionFromQr(actor: CatalogActor, input: Record<string, unknown>): Promise<{ connection: ConnectionDTO; qrCode: string | null }> {
  assertConnectionAdmin(actor.role);
  const provider = requireProvider("WASENDER");
  if (!provider.createSession) throw new WhatsAppError("Este proveedor no permite crear sesiones", 400);

  const name = clean(input.name, "Nombre de conexión", 80, true);
  const expectedPhone = normalizePhone(input.expectedPhone);
  if (!expectedPhone) throw new WhatsAppError("El número de WhatsApp es obligatorio para crear la sesión");

  const webhookId = randomBytes(24).toString("hex");
  const webhookUrl = webhookUrlFor(webhookId);
  if (!webhookUrl) throw new WhatsAppError("WHATSAPP_WEBHOOK_BASE_URL no está configurada; no se puede registrar el webhook", 400);

  const created = await provider.createSession({ name, phoneNumber: expectedPhone, webhookUrl });
  await assertExternalSessionFree(actor, created.externalId);

  try {
    const row = await getPrisma().$transaction(async (tx) => {
      const count = await tx.whatsAppConnection.count({ where: { tenantId: actor.tenantId } });
      return tx.whatsAppConnection.create({
        data: {
          tenantId: actor.tenantId,
          provider: provider.kind,
          name,
          expectedPhone,
          externalSessionId: created.externalId,
          credentials: encryptSecret(JSON.stringify(created.credentials)),
          webhookSecretHash: createHash("sha256").update(created.credentials.webhookSecret).digest("hex"),
          webhookId,
          status: created.qrCode ? "NEEDS_LINKING" : "PENDING",
          providerStatus: created.providerStatus,
          isPrimary: count === 0 && input.isPrimary !== false,
          lastCheckedAt: new Date(),
        },
      });
    });
    return { connection: toDTO(row), qrCode: await toQrImage(created.qrCode) };
  } catch (error) {
    if (error instanceof WhatsAppError) throw error;
    const message = error instanceof Error ? error.message.slice(0, 300) : "Error al guardar";
    throw new WhatsAppError(`La sesión se creó en WasenderAPI pero no se pudo guardar localmente: ${message}`, 502);
  }
}

/** Consulta el estado de vinculación; al conectarse guarda el número real y marca CONNECTED. */
export async function refreshQrConnection(actor: CatalogActor, id: string): Promise<{ connection: ConnectionDTO; qrCode: string | null }> {
  assertConnectionAdmin(actor.role);
  const row = await findOwnedConnection(actor, id);
  const provider = requireProvider(row.provider);
  if (!provider.getQrSession) throw new WhatsAppError("Este proveedor no permite consultar el estado por QR", 400);
  const credentials = JSON.parse(decryptSecret(row.credentials)) as ConnectionCredentials;
  const externalId = row.externalSessionId || credentials.sessionId;
  if (!externalId) throw new WhatsAppError("La conexión no tiene un identificador de sesión externo", 400);

  let state;
  try {
    state = await provider.getQrSession(externalId);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Error al consultar";
    await getPrisma().whatsAppConnection.update({
      where: { id },
      data: { lastCheckedAt: new Date(), lastError: message },
    });
    throw new WhatsAppError(`No se pudo consultar el estado: ${message}`, 502);
  }

  // Se prioriza el número devuelto por la SESIÓN: /api/user reporta el número de la
  // cuenta Wasender (puede ser distinto del WhatsApp vinculado) y daría un falso 409.
  let verifiedPhone = state.phone ?? row.verifiedPhone;
  if (state.status === "CONNECTED" && !verifiedPhone) {
    try {
      const detailed = await provider.verifyCredentials(credentials);
      verifiedPhone = detailed.phone ?? row.expectedPhone;
    } catch {
      // Si falla el detalle, se conserva el número esperado.
    }
  }
  if (verifiedPhone && row.expectedPhone && normalized(verifiedPhone) !== normalized(row.expectedPhone)) {
    throw new WhatsAppError("El número verificado no coincide con el número esperado", 409);
  }

  const updated = await getPrisma().whatsAppConnection.update({
    where: { id },
    data: {
      status: state.status,
      providerStatus: state.providerStatus,
      expectedPhone: row.expectedPhone ?? verifiedPhone,
      verifiedPhone: state.status === "CONNECTED" ? verifiedPhone : row.verifiedPhone,
      lastCheckedAt: new Date(),
      lastError: null,
    },
  });
  return { connection: toDTO(updated), qrCode: await toQrImage(state.qrCode) };
}

/** Genera un QR nuevo para una conexión pendiente de vinculación (el anterior venció). */
export async function regenerateQrConnection(actor: CatalogActor, id: string): Promise<{ connection: ConnectionDTO; qrCode: string | null; alreadyConnected: boolean }> {
  assertConnectionAdmin(actor.role);
  const row = await findOwnedConnection(actor, id);
  const provider = requireProvider(row.provider);
  if (!provider.regenerateQr) throw new WhatsAppError("Este proveedor no permite generar un QR nuevo", 400);
  const credentials = JSON.parse(decryptSecret(row.credentials)) as ConnectionCredentials;
  const externalId = row.externalSessionId || credentials.sessionId;
  if (!externalId) throw new WhatsAppError("La conexión no tiene un identificador de sesión externo", 400);

  let rawQr: string;
  try {
    rawQr = await provider.regenerateQr(externalId);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Error al generar el QR";
    // Si ya está vinculada en el proveedor, el estado local está desactualizado: se sincroniza.
    if ((error as { status?: number }).status === 409 && provider.getQrSession) {
      try {
        const state = await provider.getQrSession(externalId);
        const phone = state.phone ?? row.verifiedPhone ?? row.expectedPhone;
        if (phone && row.expectedPhone && normalized(phone) !== normalized(row.expectedPhone)) {
          throw new WhatsAppError("El número verificado no coincide con el número esperado", 409);
        }
        const updated = await getPrisma().whatsAppConnection.update({
          where: { id },
          data: {
            status: "CONNECTED",
            providerStatus: state.providerStatus,
            verifiedPhone: phone,
            expectedPhone: row.expectedPhone ?? phone,
            lastCheckedAt: new Date(),
            lastError: null,
          },
        });
        return { connection: toDTO(updated), qrCode: null, alreadyConnected: true };
      } catch (syncError) {
        if (syncError instanceof WhatsAppError) throw syncError;
      }
    }
    await getPrisma().whatsAppConnection.update({
      where: { id },
      data: { lastCheckedAt: new Date(), lastError: message },
    });
    throw new WhatsAppError(`No se pudo generar un QR nuevo: ${message}`, 502);
  }

  const updated = await getPrisma().whatsAppConnection.update({
    where: { id },
    data: { status: "NEEDS_LINKING", lastCheckedAt: new Date(), lastError: null },
  });
  return { connection: toDTO(updated), qrCode: (await toQrImage(rawQr)) ?? rawQr, alreadyConnected: false };
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
  const externalId = row.externalSessionId ?? credentials.sessionId;

  try {
    // El número de la sesión es la fuente correcta; /api/user da el de la cuenta Wasender.
    let sessionPhone: string | null = null;
    if (provider.getQrSession && externalId) {
      try {
        sessionPhone = (await provider.getQrSession(externalId)).phone;
      } catch {
        // Se cae al número de /api/user si el endpoint de sesión no responde.
      }
    }
    const state = await provider.verifyCredentials(credentials);
    const verifiedPhone = sessionPhone ?? state.phone ?? row.expectedPhone;
    if (verifiedPhone && row.expectedPhone && normalized(verifiedPhone) !== normalized(row.expectedPhone)) {
      throw new WhatsAppError("El número verificado no coincide con el número esperado", 409);
    }
    const updated = await getPrisma().whatsAppConnection.update({
      where: { id },
      data: {
        status: state.status,
        providerStatus: state.providerStatus,
        expectedPhone: row.expectedPhone ?? verifiedPhone,
        verifiedPhone: state.status === "CONNECTED" ? verifiedPhone : row.verifiedPhone,
        externalSessionId: row.externalSessionId ?? credentials.sessionId ?? null,
        lastCheckedAt: new Date(),
        lastError: null,
      },
    });
    return { ...toDTO(updated), verifiedPhone: state.status === "CONNECTED" ? verifiedPhone : row.verifiedPhone };
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

/**
 * Elimina una conexión y todos sus datos asociados (contactos, conversaciones,
 * mensajes, eventos y cola saliente) por cascada. Si la conexión era principal,
 * promueve otra del mismo tenant para no dejar la bandeja sin principal.
 */
export async function deleteConnection(actor: CatalogActor, id: string): Promise<void> {
  assertConnectionAdmin(actor.role);
  const existing = await findOwnedConnection(actor, id);

  // Se borra primero la sesión remota (si el proveedor lo permite). Si falla,
  // se continúa con el borrado local para no dejar la conexión atascada.
  const provider = getProvider(existing.provider);
  const externalId = existing.externalSessionId
    ?? (() => { try { return (JSON.parse(decryptSecret(existing.credentials)) as ConnectionCredentials).sessionId ?? null; } catch { return null; } })();
  if (provider?.deleteSession && externalId) {
    try {
      await provider.deleteSession(externalId);
    } catch {
      // El borrado local es la operación autoritativa; un fallo remoto no lo bloquea.
    }
  }

  await getPrisma().$transaction(async (tx) => {
    await tx.whatsAppConnection.delete({ where: { id } });
    if (existing.isPrimary) {
      const replacement = await tx.whatsAppConnection.findFirst({
        where: { tenantId: actor.tenantId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (replacement) {
        await tx.whatsAppConnection.update({ where: { id: replacement.id }, data: { isPrimary: true } });
      }
    }
  });
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
