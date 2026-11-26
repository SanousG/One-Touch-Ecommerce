import type { ConnectionCredentials } from "../../types";

const DEFAULT_BASE = "https://www.wasenderapi.com";
const TIMEOUT_MS = 15_000;

export class WasenderError extends Error {
  constructor(message: string, public status: number, public retryable: boolean) {
    super(message);
    this.name = "WasenderError";
  }
}

function baseUrl() {
  return (process.env.WASENDER_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");
}

export async function wasenderRequest(
  credentials: ConnectionCredentials,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials.apiKey}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    const text = await response.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }

    if (!response.ok) {
      const message = extractMessage(body) ?? `HTTP ${response.status}`;
      throw new WasenderError(message, response.status, response.status === 429 || response.status >= 500);
    }
    return body;
  } catch (error) {
    if (error instanceof WasenderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      // Timeout de red: la petición pudo haber sido aceptada. Estado incierto.
      throw new WasenderError("Timeout al contactar WasenderAPI", 0, true);
    }
    throw new WasenderError("Error de red al contactar WasenderAPI", 0, true);
  } finally {
    clearTimeout(timeout);
  }
}

/** Petición de administración de sesiones: usa el PAT de cuenta, no la API key de sesión. */
export async function wasenderAdminRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = (process.env.WASENDER_PERSONAL_ACCESS_TOKEN || "").trim();
  if (!token) {
    throw new WasenderError("Falta WASENDER_PERSONAL_ACCESS_TOKEN para crear sesiones", 500, false);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    const text = await response.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    if (!response.ok) {
      const message = extractMessage(body) ?? `HTTP ${response.status}`;
      throw new WasenderError(message, response.status, response.status === 429 || response.status >= 500);
    }
    return body;
  } catch (error) {
    if (error instanceof WasenderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new WasenderError("Timeout al contactar WasenderAPI", 0, true);
    }
    throw new WasenderError("Error de red al contactar WasenderAPI", 0, true);
  } finally {
    clearTimeout(timeout);
  }
}

/** Pide a Wasender que desencripte un archivo y devuelve su URL pública temporal (1 h). */
export async function wasenderDecryptMedia(credentials: ConnectionCredentials, payload: unknown): Promise<string | null> {
  const body = await wasenderRequest(credentials, "/api/decrypt-media", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const data = record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : record;
  const url = record.publicUrl ?? data.publicUrl ?? data.url;
  return typeof url === "string" && url ? url : null;
}

/** Sube bytes a Wasender y devuelve una URL pública temporal (24 h) para enviarla. */
export async function wasenderUploadMedia(
  credentials: ConnectionCredentials,
  input: { bytes: Buffer; mimeType: string; fileName: string },
): Promise<string> {
  const response = await fetch(`${baseUrl()}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "Content-Type": input.mimeType,
      "Content-Length": String(input.bytes.length),
    },
    body: new Uint8Array(input.bytes),
    cache: "no-store",
  });
  const text = await response.text();
  let body: Record<string, unknown> | null = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!response.ok) {
    const message = extractMessage(body) ?? `HTTP ${response.status}`;
    throw new WasenderError(message, response.status, response.status === 429 || response.status >= 500);
  }
  const data = body?.data && typeof body.data === "object" ? body.data as Record<string, unknown> : body;
  const url = body?.publicUrl ?? data?.publicUrl ?? data?.url;
  if (typeof url !== "string" || !url) {
    throw new WasenderError("WasenderAPI no devolvió la URL del archivo subido", 502, false);
  }
  return url;
}

export function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.message === "string") return record.message.slice(0, 300);
  return null;
}

export function extractData(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as Record<string, unknown>).data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
}
