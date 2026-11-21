"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { OrderDTO } from "@/lib/commerce/types";

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

export function OrdersList({ orders }: { orders: OrderDTO[] }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
          <p className="mt-1 text-xs text-muted">Pedidos reales del negocio, con estados de pago y entrega independientes.</p>
        </div>
        <Link href="/dashboard/orders/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
          <Icon name="plus" size={17} /> Nuevo pedido manual
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <Icon name="receipt" size={26} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold">Todavía no hay pedidos</p>
          <p className="mt-1 text-xs text-muted">Registre el primero desde «Nuevo pedido manual».</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Pedido</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Pago</th>
                  <th className="px-4 py-3 font-semibold">Preparación</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 text-right font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-background/60">
                    <td className="px-5 py-3">
                      <span className="font-semibold">#{order.orderNumber}</span>
                      <span className="block text-[11px] text-muted">{new Date(order.confirmedAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{order.customerName}</span>
                      <span className="block font-mono text-[11px] text-muted">{order.customerPhone}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</td>
                    <td className="px-4 py-3 text-xs">{FULFILLMENT_LABELS[order.fulfillmentStatus] ?? order.fulfillmentStatus}</td>
                    <td className="px-4 py-3 text-right font-semibold">S/ {order.total}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-xs font-semibold text-primary hover:underline">Ver detalle</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
