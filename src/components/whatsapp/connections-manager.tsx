"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import type { ConnectionDTO } from "@/lib/whatsapp/service";

type ProviderOption = { kind: string; label: string; available: boolean };

const STATUS_LABELS: Record<string, string> = {
  NOT_CONFIGURED: "Sin configurar",
  PENDING: "Pendiente de verificar",
  CONNECTED: "Conectado",
  CONNECTING: "Conectando",
  NEEDS_LINKING: "Requiere vinculación",
  DISCONNECTED: "Desconectado",
  ERROR: "Error",
};

type Form = {
  name: string;
  expectedPhone: string;
  apiKey: string;
  webhookSecret: string;
  sessionId: string;
};

const emptyForm: Form = { name: "", expectedPhone: "", apiKey: "", webhookSecret: "", sessionId: "" };

export function ConnectionsManager({
  connections,
  providers,
  canEdit,
  webhookBaseConfigured,
}: {
  connections: ConnectionDTO[];
  providers: ProviderOption[];
  canEdit: boolean;
  webhookBaseConfigured: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "Operación no permitida"); return false; }
      setStatus("Operación completada.");
      router.refresh();
      return true;
    } catch {
      setError("No se pudo conectar con el servidor");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/whatsapp/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, provider: "WASENDER", isPrimary: connections.length === 0 }),
      });
      const data = (await response.json()) as { error?: string; connection?: { id: string } };
      if (!response.ok || !data.connection) { setError(data.error ?? "No se pudo guardar"); return; }
      const verification = await fetch(`/api/admin/whatsapp/connections/${data.connection.id}/verify`, { method: "POST" });
      const verificationData = (await verification.json()) as { error?: string };
      if (!verification.ok) {
        setError(`Conexión guardada pero no verificada: ${verificationData.error ?? "error"}`);
        router.refresh();
        return;
      }
      setStatus("Conexión guardada y verificada.");
      setShowForm(false);
      setForm(emptyForm);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integración de WhatsApp</h1>
          <p className="mt-1 text-xs text-muted">Cada negocio usa su propia sesión y credenciales cifradas.</p>
        </div>
        {canEdit ? (
          <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
            <Icon name="plus" size={17} /> Nueva conexión
          </button>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {providers.map((provider) => (
          <div key={provider.kind} className={`rounded-xl border p-4 ${provider.available ? "border-primary/30 bg-surface" : "border-border bg-background opacity-70"}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{provider.label}</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${provider.available ? "bg-emerald-50 text-emerald-700" : "bg-surface-soft text-muted"}`}>
                {provider.available ? "Disponible" : "Próximamente"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {provider.available
                ? "Sesiones existentes, verificación de estado, webhooks y envío de texto/imagen/documento."
                : "Proveedor futuro. No se registra como conexión activa en esta fase."}
            </p>
          </div>
        ))}
      </section>

      {!webhookBaseConfigured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          WHATSAPP_WEBHOOK_BASE_URL no está configurada. Puede registrar conexiones, pero no se mostrará una URL pública de webhook hasta configurar un túnel HTTPS.
        </p>
      ) : null}

      {connections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="font-semibold">Sin conexiones configuradas</p>
          <p className="mt-1 text-xs text-muted">Registre una sesión existente de WasenderAPI para habilitar la bandeja.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {connections.map((connection) => (
            <section key={connection.id} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{connection.name}</p>
                    {connection.isPrimary ? <span className="rounded bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">Principal</span> : null}
                  </div>
                  <p className="text-xs text-muted">
                    {connection.providerLabel} · {connection.expectedPhone ?? "Sin número esperado"} · {connection.providerStatus ?? "sin estado del proveedor"}
                  </p>
                  <p className={`mt-1 text-xs font-medium ${connection.status === "CONNECTED" ? "text-emerald-700" : "text-amber-700"}`}>
                    {STATUS_LABELS[connection.status] ?? connection.status}
                  </p>
                  {connection.lastError ? <p className="mt-1 text-[11px] text-red-700">{connection.lastError}</p> : null}
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => call(`/api/admin/whatsapp/connections/${connection.id}/verify`, "POST")} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                      Guardar y verificar
                    </button>
                    <button type="button" disabled={busy} onClick={() => call(`/api/admin/whatsapp/connections/${connection.id}/disconnect`, "POST")} className="rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-50">
                      Desconectar
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 rounded-lg bg-background p-3 text-xs text-muted">
                <p className="font-semibold text-foreground">URL del webhook</p>
                {connection.webhookUrl ? (
                  <code className="mt-1 block break-all text-[11px]">{connection.webhookUrl}</code>
                ) : (
                  <p className="mt-1">No disponible hasta configurar la base pública HTTPS.</p>
                )}
                <p className="mt-2">El secreto del webhook nunca se muestra después de guardarlo.</p>
              </div>
            </section>
          ))}
        </div>
      )}

      {error ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
      {status ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{status}</p> : null}

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowForm(false)}>
          <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg space-y-3 rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Conectar sesión existente</h2>
            <p className="text-xs text-muted">La creación de sesiones y el QR se hacen en WasenderAPI. Aquí solo registramos una sesión ya creada.</p>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-medium text-muted">Nombre de conexión</span>
              <input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-medium text-muted">Número de WhatsApp esperado</span>
              <input value={form.expectedPhone} onChange={(e) => setForm({ ...form, expectedPhone: e.target.value })} placeholder="+51999999999" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-medium text-muted">Session API Key</span>
              <input required type="password" autoComplete="off" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-medium text-muted">Webhook Secret</span>
              <input required type="password" autoComplete="off" value={form.webhookSecret} onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-medium text-muted">Identificador de sesión (opcional)</span>
              <input value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })} className={inputClass} />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Guardar y verificar</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
