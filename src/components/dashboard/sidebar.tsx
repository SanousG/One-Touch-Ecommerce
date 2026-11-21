"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { TenantSwitcher } from "@/components/tenants/tenant-switcher";
import { Icon, type IconName } from "@/components/ui/icon";
import type { TenantSummary } from "@/lib/tenants/service";

type NavItem = { label: string; icon: IconName; href?: string };

const items: NavItem[] = [
  { label: "Inicio", icon: "grid", href: "/dashboard" },
  { label: "Productos", icon: "inventory", href: "/dashboard/products" },
  { label: "Tienda y landings", icon: "storefront" },
  { label: "Conversaciones", icon: "chat" },
  { label: "Pedidos", icon: "receipt" },
  { label: "Inventario", icon: "warehouse" },
  { label: "Configuración", icon: "settings" },
];

type Props = {
  tenants: TenantSummary[];
  activeTenant: TenantSummary | null;
  userName: string;
  userEmail: string;
};

export function Sidebar({ tenants, activeTenant, userName, userEmail }: Props) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-60 flex-col justify-between border-r border-border bg-surface shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
      <div>
        <div className="p-3 pb-2">
          <TenantSwitcher tenants={tenants} activeTenant={activeTenant} />
        </div>

        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Navegación
        </p>
        <nav className="flex flex-col gap-1 px-3">
          {items.map((item) => {
            if (item.href) {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary font-semibold text-white"
                      : "text-muted hover:bg-background hover:text-foreground"
                  }`}
                >
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            }
            return (
              <span
                key={item.label}
                aria-disabled="true"
                title="Disponible en una fase posterior"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400"
              >
                <Icon name={item.icon} size={20} />
                <span className="flex-1">{item.label}</span>
                <span className="text-[9px] font-medium uppercase tracking-wide text-slate-300">
                  Pronto
                </span>
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2 bg-surface p-3">
        <div className="flex items-center justify-between rounded-lg bg-background px-2.5 py-2">
          <span className="flex items-center gap-2 text-[11px] font-medium text-muted">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            WhatsApp · próximamente
          </span>
          <Icon name="lock" size={15} className="text-slate-400" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background">
              <Icon name="person" size={18} className="text-primary" />
            </span>
            <span className="flex min-w-0 flex-col text-left">
              <span className="truncate text-xs font-medium">{userName}</span>
              <span className="truncate text-[10px] text-muted">{userEmail}</span>
            </span>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
