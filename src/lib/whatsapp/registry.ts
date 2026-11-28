import type { Provider } from "./types";
import { wasenderProvider } from "./providers/wasender/adapter";

/** Registro de proveedores. Meta queda registrado como futuro no disponible. */
const providers = new Map<string, Provider>([[wasenderProvider.kind, wasenderProvider]]);

export function getProvider(kind: string): Provider | null {
  return providers.get(kind) ?? null;
}

export function listProviders(): Array<{
  kind: string;
  label: string;
  available: boolean;
  capabilities: Provider["capabilities"];
}> {
  return [
    {
      kind: "WASENDER",
      label: "WasenderAPI",
      available: true,
      capabilities: wasenderProvider.capabilities,
    },
    {
      kind: "META",
      label: "Meta WhatsApp Cloud API",
      available: false,
      capabilities: { text: false, image: false, video: false, audio: false, document: false, status: false, verify: false, webhook: false },
    },
  ];
}

export function requireProvider(kind: string): Provider {
  const provider = getProvider(kind);
  if (!provider || !provider.available) throw new Error(`El proveedor ${kind} no está disponible`);
  return provider;
}
