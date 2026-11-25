"use client";

import { useRef, useState } from "react";
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

type QrSession = {
  connectionId: string;
  qr: string | null;
  status: string;
  providerStatus: string | null;
  verifiedPhone: string | null;
};

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
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showQrForm, setShowQrForm] = useState(false);
  const [qrForm, setQrForm] = useState({ name: "", expectedPhone: "" });
  const [qrSession, setQrSession] = useState<QrSession | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const qrInFlight = useRef(false);

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

  async function refreshQr(id: string, attempts = 0) {
    if (qrInFlight.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    qrInFlight.current = true;
    try {
      const response = await fetch(`/api/admin/whatsapp/sessions/${id}`);
      const data = (await response.json()) as {
        error?: string;
        qrCode?: string | null;
        connection?: { id: string; status: string; providerStatus: string | null; verifiedPhone: string | null };
      };
      if (!response.ok || !data.connection) {
        if (data.error) setError(data.error);
        return;
      }
      const c = data.connection;
      setQrSession((prev) => ({
        connectionId: c.id,
        qr: data.qrCode ?? prev?.qr ?? null,
        status: c.status,
        providerStatus: c.providerStatus,
        verifiedPhone: c.verifiedPhone ?? prev?.verifiedPhone ?? null,
      }));
      if (c.status === "CONNECTED") {
        setStatus("WhatsApp vinculado correctamente.");
        router.refresh();
        return;
      }
      if (attempts < 75 && document.visibilityState !== "hidden") {
        setTimeout(() => { void refreshQr(id, attempts + 1); }, attempts === 0 ? 1500 : 4000);
      }
    } catch {
      setError("No se pudo consultar el estado de la vinculación");
    } finally {
      qrInFlight.current = false;
    }
  }

  async function submitQr(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...qrForm, isPrimary: connections.length === 0 }),
      });
      const data = (await response.json()) as {
        error?: string;
        qrCode?: string | null;
        connection?: { id: string; status: string; providerStatus: string | null; verifiedPhone: string | null };
      };
      if (!response.ok || !data.connection) { setError(data.error ?? "No se pudo crear la sesión"); return; }
      const c = data.connection;
      setQrSession({ connectionId: c.id, qr: data.qrCode ?? null, status: c.status, providerStatus: c.providerStatus, verifiedPhone: c.verifiedPhone });
      router.refresh();
      if (c.status !== "CONNECTED") setTimeout(() => { void refreshQr(c.id, 0); }, 1500);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  function openExistingQr(connection: { id: string; status: string; providerStatus: string | null; verifiedPhone: string | null }) {
    setError(null);
    setStatus(null);
    setShowQrForm(true);
    setQrSession({
      connectionId: connection.id,
      qr: null,
      status: connection.status,
      providerStatus: connection.providerStatus,
      verifiedPhone: connection.verifiedPhone,
    });
    void refreshQr(connection.id, 0);
  }

  async function generateNewQr() {
    if (!qrSession) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/whatsapp/sessions/${qrSession.connectionId}/regenerate`, { method: "POST" });
      const data = (await response.json()) as {
        error?: string;
        qrCode?: string | null;
        alreadyConnected?: boolean;
        connection?: { status: string; providerStatus: string | null; verifiedPhone: string | null };
      };
      if (!response.ok) { setError(data.error ?? "No se pudo generar un QR nuevo"); return; }
      if (data.alreadyConnected || !data.qrCode) {
        setStatus("La sesión ya está vinculada en WasenderAPI. Estado sincronizado.");
        setQrSession((prev) => prev ? {
          ...prev,
          status: data.connection?.status ?? "CONNECTED",
          providerStatus: data.connection?.providerStatus ?? null,
          verifiedPhone: data.connection?.verifiedPhone ?? prev.verifiedPhone,
        } : null);
        router.refresh();
        return;
      }
      const c = data.connection;
      setQrSession({
        connectionId: qrSession.connectionId,
        qr: data.qrCode,
        status: c?.status ?? "NEEDS_LINKING",
        providerStatus: c?.providerStatus ?? null,
        verifiedPhone: c?.verifiedPhone ?? null,
      });
      setStatus("QR nuevo generado. Escanéelo antes de que venza.");
      setTimeout(() => { void refreshQr(qrSession.connectionId, 0); }, 1500);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  function closeQr() {
    setShowQrForm(false);
    setQrSession(null);
    setQrForm({ name: "", expectedPhone: "" });
    router.refresh();
  }

  async function removeConnection() {
    if (!pendingDelete) return;
    const ok = await call(`/api/admin/whatsapp/connections/${pendingDelete.id}`, "DELETE");
    if (ok) setPendingDelete(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integración de WhatsApp</h1>
          <p className="mt-1 text-xs text-muted">Cada negocio usa su propia sesión y credenciales cifradas.</p>
        </div>
        {canEdit ? (
          <button type="button" onClick={() => setShowQrForm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
            <Icon name="plus" size={17} /> Conectar con QR
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
          <p className="mt-1 text-xs text-muted">Use «Conectar con QR» para vincular su WhatsApp Business y habilitar la bandeja.</p>
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
                    {connection.providerLabel} · esperado: {connection.expectedPhone ?? "—"} · verificado: {connection.verifiedPhone ?? "—"} · {connection.providerStatus ?? "sin estado del proveedor"}
                  </p>
                  <p className={`mt-1 text-xs font-medium ${connection.status === "CONNECTED" ? "text-emerald-700" : "text-amber-700"}`}>
                    {STATUS_LABELS[connection.status] ?? connection.status}
                  </p>
                  {connection.lastError ? <p className="mt-1 text-[11px] text-red-700">{connection.lastError}</p> : null}
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    {connection.status !== "CONNECTED" ? (
                      <button type="button" disabled={busy} onClick={() => openExistingQr(connection)} className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50">
                        Ver QR
                      </button>
                    ) : null}
                    <button type="button" disabled={busy} onClick={() => call(`/api/admin/whatsapp/connections/${connection.id}/verify`, "POST")} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                      Guardar y verificar
                    </button>
                    <button type="button" disabled={busy} onClick={() => call(`/api/admin/whatsapp/connections/${connection.id}/disconnect`, "POST")} className="rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-50">
                      Desconectar
                    </button>
                    <button type="button" disabled={busy} onClick={() => setPendingDelete({ id: connection.id, name: connection.name })} className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700 disabled:opacity-50">
                      Eliminar
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



      {showQrForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={closeQr}>
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Conectar WhatsApp con QR</h2>
            <p className="text-xs text-muted">
              One Touch creará la sesión, registrará el webhook y mostrará el QR. No necesitas copiar API keys ni secretos desde Wasender.
            </p>
            {!qrSession ? (
              <form onSubmit={submitQr} className="space-y-3">
                <label className="flex flex-col gap-1.5 text-xs">
                  <span className="font-medium text-muted">Nombre de conexión</span>
                  <input required maxLength={80} value={qrForm.name} onChange={(e) => setQrForm({ ...qrForm, name: e.target.value })} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5 text-xs">
                  <span className="font-medium text-muted">Número de WhatsApp Business (con código de país)</span>
                  <input required value={qrForm.expectedPhone} onChange={(e) => setQrForm({ ...qrForm, expectedPhone: e.target.value })} placeholder="+51928890983" className={inputClass} />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeQr} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
                  <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {busy ? "Creando sesión..." : "Crear sesión y mostrar QR"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-center">
                <p className={`text-sm font-semibold ${qrSession.status === "CONNECTED" ? "text-emerald-700" : "text-amber-700"}`}>
                  {qrSession.status === "CONNECTED" ? "WhatsApp vinculado" : "Escanea el QR con WhatsApp Business"}
                </p>
                <p className="text-xs text-muted">
                  {qrSession.status === "CONNECTED"
                    ? `Número verificado: ${qrSession.verifiedPhone ?? "—"}`
                    : "Abre WhatsApp Business → Ajustes → Dispositivos vinculados → Vincular dispositivo."}
                </p>
                {qrSession.qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrSession.qr} alt="Código QR para vincular WhatsApp" className="mx-auto h-64 w-64 rounded-lg border border-border bg-white p-2" />
                ) : qrSession.status !== "CONNECTED" ? (
                  <p className="text-xs text-muted">Generando QR…</p>
                ) : null}
                {qrSession.status !== "CONNECTED" ? (
                  <>
                    <p className="text-[11px] text-muted">Verificando conexión automáticamente… El QR vence en pocos minutos; si no lo escaneas, genera uno nuevo.</p>
                    <p className="text-[11px] text-amber-700">¿El QR dice «expirado» o no escanea? Genera uno nuevo.</p>
                  </>
                ) : null}
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {qrSession.status !== "CONNECTED" ? (
                    <button type="button" disabled={busy} onClick={() => void generateNewQr()} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {busy ? "Generando…" : "Generar nuevo QR"}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => void refreshQr(qrSession.connectionId, 0)} className="rounded-lg border border-border px-4 py-2 text-sm">Actualizar estado</button>
                  <button type="button" onClick={closeQr} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Listo</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setPendingDelete(null)}>
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Eliminar conexión</h2>
            <p className="text-sm text-muted">
              Se eliminará <strong>{pendingDelete.name}</strong> en One Touch junto con sus contactos, conversaciones, mensajes y eventos, y se intentará borrar también su sesión en WasenderAPI. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPendingDelete(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
              <button type="button" disabled={busy} onClick={() => void removeConnection()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Eliminando…" : "Eliminar conexión"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
