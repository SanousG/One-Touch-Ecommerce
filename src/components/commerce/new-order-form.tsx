"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import type { InventoryRowDTO } from "@/lib/commerce/types";

type Line = { variantId: string; sku: string; label: string; price: string; available: number; quantity: number };

export function NewOrderForm({ items }: { items: InventoryRowDTO[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", deliveryMode: "LOCAL", deliveryAddress: "",
    shippingCost: "0", paymentMethod: "CASH_ON_DELIVERY", requiresAdvance: false, advanceRequired: "", notes: "",
  });
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const subtotal = lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);
  const total = subtotal + (Number(form.shippingCost) || 0);
  const idempotencyKey = useState(() => crypto.randomUUID())[0];

  function addLine(variantId: string) {
    const item = items.find((row) => row.variantId === variantId);
    if (!item || lines.some((line) => line.variantId === variantId)) return;
    setLines((current) => [...current, {
      variantId,
      sku: item.sku,
      label: `${item.productName} · ${item.variantName}`,
      price: "0.00",
      available: item.available,
      quantity: 1,
    }]);
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          ...form,
          requiresAdvance: form.requiresAdvance,
          items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
        }),
      });
      const data = (await response.json()) as { error?: string; order?: { id: string } };
      if (!response.ok || !data.order) { setError(data.error ?? "No se pudo crear el pedido"); return; }
      router.push(`/dashboard/orders/${data.order.id}`);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header>
        <nav className="flex items-center gap-1 text-xs text-muted">
          <Link href="/dashboard/orders" className="hover:text-primary">Pedidos</Link>
          <Icon name="chevronRight" size={13} />
          <span className="text-foreground">Nuevo pedido manual</span>
        </nav>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Nuevo pedido manual</h1>
        <p className="mt-1 text-xs text-muted">Registre una venta acordada con el cliente. El stock se reserva al confirmar.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">1. Datos del cliente</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted">Nombre completo</span>
                <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted">WhatsApp / Teléfono</span>
                <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className={inputClass} />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">2. Productos del pedido</h2>
              <select onChange={(event) => { addLine(event.target.value); event.target.value = ""; }} className={inputClass + " max-w-xs"}>
                <option value="">+ Añadir variante…</option>
                {items.filter((item) => !lines.some((line) => line.variantId === item.variantId)).map((item) => (
                  <option key={item.variantId} value={item.variantId}>
                    {item.productName} · {item.variantName} ({item.available} disp.)
                  </option>
                ))}
              </select>
            </div>
            {lines.length === 0 ? (
              <p className="text-xs text-muted">Agregue al menos una variante.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {lines.map((line) => (
                  <div key={line.variantId} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{line.label}</span>
                      <button type="button" onClick={() => setLines((current) => current.filter((item) => item.variantId !== line.variantId))} className="text-xs text-red-600">Quitar</button>
                    </div>
                    <p className="font-mono text-[11px] text-muted">{line.sku} · {line.available} disponibles</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 text-[11px] text-muted">
                        Cantidad
                        <input
                          type="number" min={1} max={line.available} value={line.quantity}
                          onChange={(e) => setLines((current) => current.map((item) => item.variantId === line.variantId ? { ...item, quantity: Number(e.target.value) } : item))}
                          className={inputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] text-muted">
                        Precio unitario vigente
                        <input
                          type="number" min={0} step="0.01" value={line.price}
                          onChange={(e) => setLines((current) => current.map((item) => item.variantId === line.variantId ? { ...item, price: e.target.value } : item))}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted">El precio se toma del catálogo al confirmar. El servidor revalida importes y disponibilidad.</p>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">3. Entrega y cobro</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted">Modalidad de entrega</span>
                <select value={form.deliveryMode} onChange={(e) => setForm({ ...form, deliveryMode: e.target.value })} className={inputClass}>
                  <option value="LOCAL">Entrega local</option>
                  <option value="PICKUP">Recojo en tienda</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted">Dirección / destino</span>
                <input value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted">Costo de envío</span>
                <input type="number" min={0} step="0.01" value={form.shippingCost} onChange={(e) => setForm({ ...form, shippingCost: e.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted">Modalidad de pago</span>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className={inputClass}>
                  <option value="CASH_ON_DELIVERY">Contraentrega</option>
                  <option value="TRANSFER">Transferencia</option>
                </select>
              </label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.requiresAdvance} onChange={(e) => setForm({ ...form, requiresAdvance: e.target.checked })} />
              Requiere adelanto
            </label>
            {form.requiresAdvance ? (
              <label className="mt-2 flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted">Monto del adelanto</span>
                <input type="number" min={0} step="0.01" value={form.advanceRequired} onChange={(e) => setForm({ ...form, advanceRequired: e.target.value })} className={inputClass} />
              </label>
            ) : null}
            <label className="mt-4 flex flex-col gap-1.5 text-xs">
              <span className="font-medium text-muted">Notas</span>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
            </label>
          </section>
        </div>

        <aside className="lg:col-span-4">
          <section className="sticky top-24 rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Resumen del pedido</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Productos</span><span>S/ {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Envío</span><span>S/ {(Number(form.shippingCost) || 0).toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span className="text-primary">S/ {total.toFixed(2)}</span></div>
            </div>
            <div className="mt-4 rounded-lg bg-background p-3 text-[11px] text-muted">
              Al confirmar se valida stock y se reservan las unidades. La operación es atómica; un reintento con la misma clave no crea otro pedido.
            </div>
            {error ? <p role="alert" className="mt-3 text-xs text-red-700">{error}</p> : null}
            <button
              type="button"
              onClick={submit}
              disabled={saving || lines.length === 0}
              className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Confirmando…" : "Confirmar pedido"}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
