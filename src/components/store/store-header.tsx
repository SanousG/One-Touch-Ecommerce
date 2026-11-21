"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cartCount, getCartSnapshot, subscribeCart, type CartItem } from "@/lib/store/cart";
import type { StoreTenantDTO } from "@/lib/store/service";

const EMPTY_ITEMS: CartItem[] = [];

export function StoreHeader({ store }: { store: StoreTenantDTO }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const items = useSyncExternalStore(
    subscribeCart,
    () => getCartSnapshot(store.id),
    () => EMPTY_ITEMS,
  );
  const count = cartCount(items);
  const base = `/tienda/${store.slug}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 lg:px-12">
        <div className="flex shrink-0 items-center gap-3">
          <Link href={base} className="text-lg font-bold tracking-tight text-foreground">
            {store.name.split(" ")[0]}<span className="text-primary">.tienda</span>
          </Link>
          <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 sm:inline">
            Tienda oficial
          </span>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href={base} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-foreground">Catálogo</Link>
          <span className="cursor-not-allowed rounded-lg px-3 py-1.5 text-sm text-slate-300" title="Disponible en una fase posterior">Ofertas</span>
          <span className="cursor-not-allowed rounded-lg px-3 py-1.5 text-sm text-slate-300" title="Disponible en una fase posterior">Ayuda</span>
        </nav>

        <div className="hidden max-w-md flex-1 sm:block">
          <div className="relative flex items-center">
            <Icon name="search" size={18} className="pointer-events-none absolute left-3 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") router.push(query.trim() ? `${base}?q=${encodeURIComponent(query.trim())}` : base);
              }}
              placeholder="Buscar producto..."
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <Link
          href={`${base}/carrito`}
          className="relative inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-background"
        >
          <Icon name="bag" size={19} />
          <span className="hidden sm:inline">Carrito</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">{count}</span>
        </Link>
      </div>
    </header>
  );
}
