import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Icon } from "@/components/ui/icon";
import { getAttention, listOrders, requireCommerceActor } from "@/lib/commerce/service";
import { requireDashboardContext } from "@/lib/tenants/context";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, activeTenant } = await requireDashboardContext();
  if (!activeTenant) redirect("/onboarding");
  const actor = await requireCommerceActor();
  const [attention, orders] = await Promise.all([getAttention(actor), listOrders(actor)]);
  const firstName = user.name.split(" ")[0] || user.name;
  const preparing = orders.filter((order) => order.fulfillmentStatus === "PREPARING").length;

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Resumen de hoy</h1>
          <p className="mt-1 text-xs text-muted">
            Hola, {firstName}. Estás viendo <span className="font-medium text-foreground">{activeTenant.name}</span>.
          </p>
        </div>
        <Link href="/dashboard/orders/new" className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
          <Icon name="plus" size={16} /> Nuevo pedido manual
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Requiere atención</h2>
          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted">{attention.length} pendientes</span>
        </div>
        {attention.length === 0 ? (
          <EmptyState icon="inbox" title="Todo al día" description="No hay comprobantes por verificar ni pedidos listos para preparar en este negocio." />
        ) : (
          <div className="flex flex-col gap-2">
            {attention.map((item) => (
              <Link
                key={`${item.type}-${item.orderId}`}
                href={`/dashboard/orders/${item.orderId}`}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-xs hover:bg-surface-soft"
              >
                <span>
                  <span className="block font-semibold">Pedido #{item.orderNumber} · {item.customerName}</span>
                  <span className="block text-muted">{item.description}</span>
                </span>
                <Icon name="chevronRight" size={15} className="text-muted" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Conversaciones iniciadas</span>
            <Icon name="chat" size={18} className="text-slate-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">—</p>
            <p className="mt-1 text-[11px] text-muted">Bandeja disponible en una fase posterior.</p>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pedidos confirmados</span>
            <Icon name="receipt" size={18} className="text-slate-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{orders.length}</p>
            <p className="mt-1 text-[11px] text-muted">Registrados en este negocio.</p>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pedidos en preparación</span>
            <Icon name="warehouse" size={18} className="text-slate-400" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{preparing}</p>
            <p className="mt-1 text-[11px] text-muted">Estado real desde PostgreSQL.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between p-4 md:p-5">
          <h2 className="text-sm font-semibold tracking-tight">Pedidos recientes</h2>
          <Link href="/dashboard/orders" className="text-[11px] font-semibold text-primary hover:underline">Ver todos</Link>
        </div>
        <div className="px-4 pb-4 md:px-5 md:pb-5">
          {orders.length === 0 ? (
            <EmptyState icon="receipt" title="Aún no hay pedidos" description="Registre el primer pedido manual para verlo aquí." />
          ) : (
            <div className="flex flex-col gap-2">
              {orders.slice(0, 5).map((order) => (
                <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs hover:bg-background">
                  <span><strong>#{order.orderNumber}</strong> · {order.customerName}</span>
                  <span className="text-muted">S/ {order.total}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
