"use client";

import { usePathname } from "next/navigation";
import { StoreFooter } from "./store-footer";
import { StoreHeader } from "./store-header";
import type { StoreTenantDTO } from "@/lib/store/service";

/** Las landing son páginas independientes: no llevan la cabecera ni el pie de la tienda. */
export function StoreShell({ store, children }: { store: StoreTenantDTO; children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname.includes("/landing/");

  if (isLanding) {
    return <div className="min-h-screen bg-surface">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <StoreHeader store={store} />
      <main className="flex-1 pt-16">{children}</main>
      <StoreFooter storeName={store.name} />
    </div>
  );
}
