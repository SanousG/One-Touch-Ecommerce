"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import type { InventoryRowDTO, MovementDTO } from "@/lib/commerce/types";

type Props = { items: InventoryRowDTO[]; movements: MovementDTO[]; canAdjust: boolean };

const REASONS: Record<string, string> = {
  INITIAL: "Inventario inicial",
  RESTOCK: "Reposición",
  DAMAGE: "Daño",
  COUNT_CORRECTION: "Corrección por conteo",
  OTHER: "Otro motivo",
};

export function InventoryView({ items, movements, canAdjust }: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<InventoryRowDTO | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("RESTOCK");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const filtered = items.filter((item) =>
    `${item.productName} ${item.variantName} ${item.sku}`.toLowerCase().includes(q.toLowerCase()),
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selected.variantId, delta: Number(delta), reason, note }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "No se pudo guardar el ajuste"); return; }
      setStatus("Ajuste guardado en el historial.");
      setDelta("");
      setNote("");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
          <p className="mt-1 text-xs text-muted">
            Existencias físicas, reservas comprometidas y stock disponible. Ubicación: almacén único del negocio.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-2 text-xs shadow-sm">
          <span>SKUs: <strong>{items.length}</strong></span>
          <span className="h-4 w-px bg-border" />
          <span>Comprometido: <strong className="text-primary">{items.reduce((sum, item) => sum + item.reserved, 0)} uds.</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="flex flex-col gap-4 xl:col-span-7">
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar producto, variante o SKU" className={`${inputClass} pl-9`} />
          </div>

          <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Producto y variante</th>
                    <th className="px-2 py-3 text-center font-semibold">Físico</th>
                    <th className="px-2 py-3 text-center font-semibold">Reservado</th>
                    <th className="px-2 py-3 text-center font-semibold">Disponible</th>
                    <th className="px-4 py-3 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-xs text-muted">No hay variantes para mostrar.</td></tr>
                  ) : filtered.map((item) => (
                    <tr key={item.variantId} className={selected?.variantId === item.variantId ? "bg-primary-soft/40" : "hover:bg-background/60"}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-muted">
                            {item.coverUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
                            ) : <Icon name="box" size={18} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{item.productName}</span>
                            <span className="block truncate text-xs text-muted">{item.variantName} · <span className="font-mono">{item.sku}</span></span>
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center font-semibold">{item.physical}</td>
                      <td className="px-2 py-3 text-center text-primary">{item.reserved}</td>
                      <td className="px-2 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.available > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {item.available} disp.
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!canAdjust}
                          onClick={() => { setSelected(item); setError(null); setStatus(null); }}
                          className="rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary disabled:opacity-40"
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-background p-4 text-xs text-muted">
            El stock se reserva al confirmar un pedido. Agregar al carrito o escribir por WhatsApp no reserva unidades.
          </section>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-5">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Ajustar stock</h2>
            {!selected ? (
              <p className="mt-3 text-xs text-muted">Seleccione una variante de la tabla para registrar un ajuste.</p>
            ) : (
              <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                <p className="rounded-lg bg-background p-2 text-xs">{selected.productName} · {selected.variantName}</p>
                <label className="flex flex-col gap-1.5 text-xs">
                  <span className="font-medium text-muted">Cantidad (negativa para retirar)</span>
                  <input required type="number" step="1" value={delta} onChange={(event) => setDelta(event.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5 text-xs">
                  <span className="font-medium text-muted">Motivo</span>
                  <select value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass}>
                    {Object.entries(REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs">
                  <span className="font-medium text-muted">Nota</span>
                  <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
                </label>
                <div className="rounded-lg bg-background p-3 text-xs">
                  <p>Físico actual: <strong>{selected.physical}</strong> · Reservado: <strong>{selected.reserved}</strong></p>
                  <p>Proyectado: <strong>{selected.physical + (Number(delta) || 0)}</strong> físicas</p>
                </div>
                {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
                {status ? <p role="status" className="text-xs text-emerald-700">{status}</p> : null}
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar ajuste"}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Movimientos recientes</h2>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {movements.length === 0 ? (
                <p className="text-xs text-muted">Sin movimientos registrados.</p>
              ) : movements.map((movement) => (
                <div key={movement.id} className="rounded-lg border border-border p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{REASONS[movement.reason] ?? movement.reason}</span>
                    <span className={movement.delta > 0 ? "text-emerald-700" : "text-red-700"}>
                      {movement.delta > 0 ? "+" : ""}{movement.delta}
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted">Físico {movement.previousPhysical} → {movement.newPhysical}</p>
                  <p className="text-muted">{new Date(movement.createdAt).toLocaleString()}{movement.note ? ` · ${movement.note}` : ""}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
