"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import type { OrderDTO } from "@/lib/commerce/types";

type Props = { order: OrderDTO; canVerifyPayments: boolean; canAdjustFulfillment: boolean };

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Pendiente de cobro",
  ADVANCE_PENDING: "Adelanto pendiente",
  VOUCHER_RECEIVED: "Comprobante por verificar",
  ADVANCE_VERIFIED: "Adelanto verificado",
  PAID: "Pagado",
};
const FULFILLMENT_LABELS: Record<string, string> = {
  WAITING_ADVANCE: "En espera de adelanto",
  READY_TO_PREPARE: "Pendiente de preparación",
  PREPARING: "En preparación",
  SHIPPED: "Despachado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export function OrderDetail({ order, canVerifyPayments, canAdjustFulfillment }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState("");

  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "Acción no permitida"); return; }
      setStatus("Acción registrada correctamente.");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  async function uploadVoucher(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !amount) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("amountReported", amount);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/voucher`, { method: "POST", body: form });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "No se pudo adjuntar"); return; }
      setStatus("Comprobante adjunto. El pago sigue sin verificar.");
      setFile(null);
      setAmount("");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  const unpaidAdvance = Number(order.advanceRequired) - Number(order.advancePaid);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header>
        <nav className="flex items-center gap-1 text-xs text-muted">
          <Link href="/dashboard/orders" className="hover:text-primary">Pedidos</Link>
          <Icon name="chevronRight" size={13} />
          <span className="text-foreground">Pedido #{order.orderNumber}</span>
        </nav>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Pedido #{order.orderNumber}</h1>
          <span className="rounded-full bg-surface-soft px-2.5 py-0.5 text-xs text-muted">Origen: {order.origin}</span>
        </div>
        <p className="mt-1 text-xs text-muted">{order.customerName} · {order.customerPhone} · {order.deliveryMode === "LOCAL" ? "Entrega local" : "Recojo en tienda"}</p>
      </header>

      {error ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
      {status ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{status}</p> : null}

      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-surface p-4 text-xs shadow-sm">
        <span>Pago: <strong>{PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</strong></span>
        <span className="h-4 w-px bg-border" />
        <span>Preparación: <strong>{FULFILLMENT_LABELS[order.fulfillmentStatus] ?? order.fulfillmentStatus}</strong></span>
        <span className="h-4 w-px bg-border" />
        <span>Modalidad: <strong>{order.paymentMethod === "TRANSFER" ? "Transferencia" : "Contraentrega"}</strong></span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Detalle del pedido</h2>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-muted">{item.variantName} · <span className="font-mono">{item.sku}</span> · Cant: {item.quantity}</p>
                </div>
                <span className="text-sm font-semibold">S/ {item.lineTotal}</span>
              </div>
            ))}
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span>S/ {order.subtotal}</span></div>
              <div className="flex justify-between text-muted"><span>Envío</span><span>{order.shippingKnown ? `S/ ${order.shippingCost}` : "Por confirmar"}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span className="text-primary">S/ {order.total}</span></div>
            </div>
            {order.deliveryAddress ? <p className="mt-3 rounded-lg bg-background p-3 text-xs text-muted">Destino: {order.deliveryAddress}</p> : null}
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">Historial de actividad</h2>
            <div className="space-y-3">
              {order.events.map((event) => (
                <div key={event.id} className="rounded-lg border border-border p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{event.description}</span>
                    <span className="text-muted">{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  {event.amount ? <p className="mt-1 text-primary">Monto: S/ {event.amount}</p> : null}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          {order.requiresAdvance ? (
            <section className="rounded-xl border-2 border-primary/20 bg-surface p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Adelantos y comprobantes</h2>
              <p className="mt-2 text-xs text-muted">Requerido: S/ {order.advanceRequired} · Verificado: S/ {order.advancePaid} · Pendiente: S/ {unpaidAdvance.toFixed(2)}</p>

              {order.vouchers.map((voucher) => (
                <div key={voucher.id} className="mt-3 rounded-lg border border-border p-3 text-xs">
                  <p className="font-medium">{voucher.fileName}</p>
                  <p className="text-muted">Reportado: S/ {voucher.amountReported} · {voucher.verified ? "Verificado" : "Sin verificar"}</p>
                  <div className="mt-2 flex gap-2">
                    <a href={voucher.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ver comprobante</a>
                    {!voucher.verified && canVerifyPayments ? (
                      <button type="button" disabled={busy} onClick={() => action({ action: "VERIFY_ADVANCE", voucherId: voucher.id, amount: voucher.amountReported })} className="font-semibold text-emerald-700 hover:underline">
                        Verificar adelanto
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {canVerifyPayments ? (
                <form onSubmit={uploadVoucher} className="mt-4 space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-medium">Adjuntar comprobante</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
                  <input type="number" min="0" step="0.01" placeholder="Monto reportado" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
                  <button type="submit" disabled={busy || !file || !amount} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Adjuntar</button>
                </form>
              ) : null}
              <p className="mt-3 text-[11px] text-amber-700">El comprobante no prueba que el dinero haya ingresado. Verifique en su banca antes de confirmar.</p>
            </section>
          ) : null}

          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Gestión de preparación</h2>
            <p className="mb-3 text-xs text-muted">Verificar un adelanto no inicia la preparación automáticamente.</p>
            <div className="flex flex-col gap-2">
              {order.fulfillmentStatus === "READY_TO_PREPARE" ? (
                <button type="button" disabled={busy || !canAdjustFulfillment} onClick={() => action({ action: "START_PREPARATION" })} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Iniciar preparación</button>
              ) : null}
              {order.fulfillmentStatus === "PREPARING" ? (
                <button type="button" disabled={busy || !canAdjustFulfillment} onClick={() => action({ action: "SHIP" })} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Marcar despachado</button>
              ) : null}
              {order.fulfillmentStatus === "SHIPPED" ? (
                <button type="button" disabled={busy || !canAdjustFulfillment} onClick={() => action({ action: "DELIVER" })} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Marcar entregado</button>
              ) : null}
              {!["CANCELLED", "SHIPPED", "DELIVERED"].includes(order.fulfillmentStatus) ? (
                <button type="button" disabled={busy || !canAdjustFulfillment} onClick={() => action({ action: "CANCEL" })} className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Cancelar pedido</button>
              ) : null}
            </div>
          </section>

          {order.paymentStatus !== "PAID" && order.paymentStatus !== "PENDING" && canVerifyPayments ? (
            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">Registrar cobro confirmado</h2>
              <form onSubmit={(event) => { event.preventDefault(); action({ action: "RECORD_PAYMENT", amount }); }} className="space-y-2">
                <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto cobrado" className={inputClass} />
                <button type="submit" disabled={busy || !amount} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Registrar cobro</button>
              </form>
              <p className="mt-2 text-[11px] text-muted">Marcar entregado no marca automáticamente el pago como recibido.</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
