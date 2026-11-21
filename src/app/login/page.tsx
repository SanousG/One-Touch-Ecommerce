import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Icon } from "@/components/ui/icon";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="z-20 w-full border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 lg:px-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
            <Icon name="hub" size={18} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Panel de ventas</span>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-6 lg:py-16">
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-12">
            <section className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-8 shadow-sm lg:col-span-5 lg:p-12">
              <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-primary-soft blur-3xl" />

              <div className="relative">
                <div className="mb-12 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
                    <Icon name="terminal" size={20} />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold tracking-tight">Panel de ventas</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Acceso operativo
                    </span>
                  </div>
                </div>

                <div className="mb-8 space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
                  <p className="text-sm text-muted">Accede al panel de tu negocio</p>
                </div>

                <LoginForm />

                <div className="mt-8 flex items-start gap-2 rounded-lg bg-background p-3.5">
                  <Icon name="store" size={18} className="mt-0.5 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-muted">
                    Si tienes acceso a más de un negocio, podrás elegirlo después de ingresar.
                  </p>
                </div>
              </div>
            </section>

            <section className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface-soft p-8 shadow-sm lg:col-span-7 lg:p-12">
              <div className="relative z-10 max-w-xl">
                <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                  <Icon name="check" size={14} /> Ejemplo de venta
                </span>
                <h2 className="text-2xl font-semibold leading-snug tracking-tight lg:text-3xl">
                  Tus ventas por WhatsApp, en un solo panel
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-muted lg:text-base">
                  Centraliza chats, toma pedidos al instante y mantén el inventario sincronizado en
                  tiempo real.
                </p>
              </div>

              <div className="relative z-10 mx-auto my-10 flex w-full max-w-lg flex-col items-center">
                <div className="w-full rounded-xl border border-border bg-surface p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between border-b border-border bg-surface pb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        WhatsApp Business
                      </span>
                      <span className="text-[11px] font-medium text-primary">
                        Paso 1 · Mensaje del cliente
                      </span>
                    </div>
                    <span className="text-[11px] text-muted">14:32</span>
                  </div>
                  <p className="text-sm text-foreground">
                    “Hola, quiero 2 unidades de la Barra LED recargable en San Borja”
                  </p>
                </div>

                <div className="my-3 flex flex-col items-center">
                  <span className="h-4 w-0.5 bg-border" />
                  <span className="z-10 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[11px] font-medium shadow-sm">
                    <Icon name="check" size={16} className="text-primary" />
                    Paso 2 · Cliente confirma la compra
                  </span>
                  <span className="h-4 w-0.5 bg-border" />
                </div>

                <div className="w-full rounded-xl border border-border bg-surface p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 pb-3">
                    <span className="rounded bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                      Pedido #PV-4892
                    </span>
                    <span className="text-[11px] font-medium text-primary">
                      Paso 3 · Pedido registrado
                    </span>
                    <span className="text-[11px] text-muted">Hace 1 min</span>
                  </div>
                  <div className="rounded-lg bg-background p-3">
                    <p className="text-sm font-medium">2x Barra LED recargable (Cálida)</p>
                    <p className="text-[11px] text-muted">Destino: Lima · San Borja</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <footer className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted sm:flex-row">
            <p>© 2025 Panel de ventas. Todos los derechos reservados.</p>
            <div className="flex items-center gap-3">
              <span>Centro de ayuda</span>
              <span>·</span>
              <span>Soporte técnico</span>
              <span>·</span>
              <span>Privacidad</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
