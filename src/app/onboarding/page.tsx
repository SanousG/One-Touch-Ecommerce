import { CreateTenantForm } from "@/components/tenants/create-tenant-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/lib/auth/session";
import { getActiveTenantForUser, listUserTenants } from "@/lib/tenants/service";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser();
  const [tenants, activeTenant] = await Promise.all([
    listUserTenants(user.id),
    getActiveTenantForUser(user.id),
  ]);
  const isFirst = tenants.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
              <Icon name="hub" size={18} />
            </span>
            <span className="text-sm font-semibold">Panel de ventas</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="hidden sm:inline">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-surface p-8 shadow-sm">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
              <Icon name="store" size={14} /> Paso {isFirst ? 1 : 2} de 2
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isFirst ? "Crea tu primer negocio" : "Crear otro negocio"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Cada negocio tiene sus propios datos, membresías y permisos. Podrás cambiar entre
              ellos desde la barra lateral.
            </p>
            <div className="mt-8">
              <CreateTenantForm />
            </div>
          </section>

          <section className="flex flex-col justify-between rounded-xl border border-border bg-surface p-8 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold">Tus negocios</h2>
              <p className="mt-1 text-xs text-muted">Solo ves los negocios a los que perteneces.</p>
              <div className="mt-5 space-y-2">
                {tenants.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center text-xs text-muted">
                    Todavía no tienes negocios. Crea el primero para continuar.
                  </p>
                ) : (
                  tenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Icon name="store" size={17} className="text-primary" />
                        {tenant.name}
                      </span>
                      <span className="text-[11px] text-muted">
                        {tenant.id === activeTenant?.id ? "Activo" : tenant.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="mt-8 text-[11px] leading-relaxed text-muted">
              Para cambiar el negocio activo usa el selector de la barra lateral del panel.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
