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
