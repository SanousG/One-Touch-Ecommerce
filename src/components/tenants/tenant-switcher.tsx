"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { TenantSummary } from "@/lib/tenants/service";

type Props = {
  tenants: TenantSummary[];
  activeTenant: TenantSummary | null;
};

export function TenantSwitcher({ tenants, activeTenant }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function selectTenant(tenantId: string) {
    setOpen(false);
    if (tenantId === activeTenant?.id) return;
    setLoadingId(tenantId);
    try {
      const response = await fetch("/api/tenants/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-background"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <Icon name="store" size={18} />
          </span>
          <span className="flex min-w-0 flex-col text-left">
            <span className="truncate text-sm font-semibold leading-tight">
              {activeTenant?.name ?? "Sin negocio"}
            </span>
            <span className="truncate text-[11px] text-muted">
              {activeTenant ? `Rol: ${activeTenant.role === "OWNER" ? "Propietario" : "Operador"}` : "Selecciona un negocio"}
            </span>
          </span>
        </span>
        <Icon name="chevron" size={18} className="shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              type="button"
              role="option"
              aria-selected={tenant.id === activeTenant?.id}
              onClick={() => selectTenant(tenant.id)}
              className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-background"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{tenant.name}</span>
                <span className="block text-[10px] text-muted">
                  {tenant.role === "OWNER" ? "Propietario" : "Operador"}
                </span>
              </span>
              {loadingId === tenant.id ? (
                <span className="text-[10px] text-muted">…</span>
              ) : tenant.id === activeTenant?.id ? (
                <Icon name="check" size={15} className="text-primary" />
              ) : null}
            </button>
          ))}
          <a
            href="/onboarding"
            className="mt-1 flex items-center gap-1.5 rounded-md border-t border-border px-2.5 py-2 text-xs font-medium text-primary hover:bg-background"
          >
            <Icon name="plus" size={14} /> Crear otro negocio
          </a>
        </div>
      ) : null}
    </div>
  );
}
