import { redirect } from "next/navigation";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { requireDashboardContext } from "@/lib/tenants/context";

const metrics: { label: string; icon: IconName }[] = [
  { label: "Conversaciones iniciadas", icon: "chat" },
  { label: "Pedidos confirmados", icon: "receipt" },
  { label: "Pedidos en preparación", icon: "warehouse" },
];

export default async function DashboardPage() {
  const { user, activeTenant } = await requireDashboardContext();
  if (!activeTenant) redirect("/onboarding");
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Resumen de hoy</h1>
          <p className="mt-1 text-xs text-muted">
            Hola, {firstName}. Estás viendo{" "}
            <span className="font-medium text-foreground">
              {activeTenant?.name ?? "tu negocio"}
            </span>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Disponible en una fase posterior"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted"
          >
            <Icon name="settings" size={16} /> Filtros
          </button>
          <button
            type="button"
            disabled
            title="Disponible en una fase posterior"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/60 px-3 py-2 text-xs font-medium text-white"
          >
            <Icon name="plus" size={16} /> Nuevo pedido manual
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Requiere atención</h2>
          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted">
            0 pendientes
          </span>
        </div>
        <EmptyState
          icon="inbox"
          title="Todo al día"
          description="Cuando los módulos de conversaciones y pedidos estén disponibles, aquí verás los elementos que requieran tu atención."
        />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {metric.label}
              </span>
              <Icon name={metric.icon} size={18} className="text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">—</p>
              <p className="mt-1 text-[11px] text-muted">
                Sin datos hasta conectar los módulos correspondientes.
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between p-4 md:p-5">
          <h2 className="text-sm font-semibold tracking-tight">Pedidos recientes</h2>
          <span className="text-[11px] text-muted">Últimos registrados</span>
        </div>
        <div className="px-4 pb-4 md:px-5 md:pb-5">
          <EmptyState
            icon="receipt"
            title="Aún no hay pedidos"
            description="Los pedidos cerrados por el chatbot aparecerán aquí cuando el módulo esté disponible."
          />
        </div>
      </section>
    </div>
  );
}
