"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

type Props = {
  tenantSlug: string;
  landingSlug: string;
  enabled: boolean;
  label?: string;
  style?: React.CSSProperties;
  align?: "start" | "center";
  endpoint?: string;
};

export function LandingWhatsappButton({
  tenantSlug,
  landingSlug,
  enabled,
  label = "Hablar por WhatsApp",
  style,
  align = "start",
  endpoint,
}: Props) {
  const alignment = align === "center" ? "items-center text-center" : "items-start";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function openChat() {
    setBusy(true);
    setError(null);
    try {
      const path = endpoint ?? `/api/store/${tenantSlug}/landing/${landingSlug}/whatsapp`;
      const response = await fetch(path, { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "No se pudo preparar la consulta");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <div className={`flex flex-col gap-1 ${alignment}`}>
        <button type="button" disabled style={style} className="inline-flex items-center gap-3 rounded-lg bg-slate-300 px-7 py-3.5 font-semibold text-white">
          <Icon name="whatsapp" size={20} /> {label}
        </button>
        <span className="text-xs text-amber-700">La consulta por WhatsApp todavía no está disponible en esta tienda.</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${alignment}`}>
      <button
        type="button"
        onClick={openChat}
        disabled={busy}
        style={style}
        className="inline-flex items-center gap-3 rounded-lg bg-emerald-600 px-7 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        <Icon name="whatsapp" size={20} /> {busy ? "Preparando…" : label}
      </button>
      <span className="text-xs text-muted">Abre un chat con un mensaje listo. Revísalo y toca Enviar.</span>
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
