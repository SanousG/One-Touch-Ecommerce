"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";

type Props = { phone: string | null; canEdit: boolean };

export function WhatsappSettings({ phone, canEdit }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/tenants/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: value }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "No se pudo guardar"); return; }
      setSaved(true);
      router.refresh();
    } finally { setSaving(false); }
  }

  return (
    <section className="max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon name="chat" size={20} className="text-emerald-600" />
        <h2 className="text-sm font-semibold">Canal de WhatsApp</h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-muted">
        Este número se usa en los enlaces Click to Chat de la tienda pública. Las consultas no crean pedidos ni se envían automáticamente: el cliente debe pulsar «Enviar» en WhatsApp.
      </p>
      {!canEdit ? (
        <p className="mb-4 rounded-lg bg-background px-3 py-2 text-xs text-muted">
          Solo el propietario (OWNER) puede modificar este número.
        </p>
      ) : null}
      <form onSubmit={submit} className="space-y-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Número en formato internacional</span>
          <input
            value={value}
            disabled={!canEdit}
            onChange={(event) => setValue(event.target.value)}
            placeholder="+51999999999"
            className={inputClass}
          />
        </label>
        {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Número guardado.</p> : null}
        {canEdit ? (
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Guardando…" : "Guardar número"}
          </button>
        ) : null}
      </form>
      <p className="mt-4 text-[11px] text-muted">
        Estado actual: {phone ? <span className="font-medium text-emerald-700">Configurado</span> : <span className="font-medium text-amber-700">Sin configurar</span>}
      </p>
    </section>
  );
}
