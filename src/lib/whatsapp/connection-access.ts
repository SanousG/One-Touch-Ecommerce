import "server-only";
import { getPrisma } from "../db/prisma";
import { decryptSecret } from "./crypto";
import { requireProvider } from "./registry";
import type { ConnectionCredentials } from "./types";

/** Acceso de bajo nivel a conexiones, sin dependencias de Next ( usable por el worker ). */
export async function getConnectionByWebhookId(webhookId: string) {
  return getPrisma().whatsAppConnection.findUnique({ where: { webhookId } });
}

export function getConnectionCredentials(row: { credentials: string }): ConnectionCredentials {
  return JSON.parse(decryptSecret(row.credentials)) as ConnectionCredentials;
}

export function getConnectionProvider(row: { provider: "WASENDER" | "META" }) {
  return requireProvider(row.provider);
}
