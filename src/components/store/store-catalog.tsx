"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { StoreCategoryDTO, StoreProductDTO, StoreTenantDTO } from "@/lib/store/service";

type Props = {
  store: StoreTenantDTO;
  products: StoreProductDTO[];
  categories: StoreCategoryDTO[];
  filters: { q?: string; categoryId?: string };
};

export function StoreCatalog({ store, products, categories, filters }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? "");
  const base = `/tienda/${store.slug}`;

  function go(next: { q?: string; categoryId?: string }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.categoryId) params.set("categoryId", next.categoryId);
    router.replace(params.size ? `${base}?${params.toString()}` : base);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-12">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs text-muted">Inicio / Catálogo</p>
          <div className="mt-1 flex items-baseline gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
            <span className="text-sm text-muted">({products.length} {products.length === 1 ? "producto" : "productos"})</span>
          </div>
        </div>
        <div className="relative w-full max-w-sm">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && go({ q, categoryId: filters.categoryId })}
            placeholder="Buscar producto..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => go({ q, categoryId: undefined })}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${!filters.categoryId ? "bg-primary text-white" : "border border-border bg-surface text-muted hover:text-foreground"}`}
        >
          Todos
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => go({ q, categoryId: category.id })}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${filters.categoryId === category.id ? "bg-primary text-white" : "border border-border bg-surface text-muted hover:text-foreground"}`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <Icon name="bag" size={26} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold">No hay productos para mostrar</p>
          <p className="mt-1 text-xs text-muted">Pruebe con otra búsqueda o categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <article key={product.id} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
              <Link href={`${base}/producto/${product.slug}`} className="relative block aspect-square overflow-hidden bg-background">
                {product.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.coverUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <span className="flex h-full items-center justify-center text-slate-300"><Icon name="image" size={28} /></span>
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted">{product.categoryName ?? "Producto"}</p>
                <h2 className="line-clamp-1 text-sm font-semibold">{product.name}</h2>
                <p className="text-sm font-bold">{product.priceLabel}</p>
                <Link
                  href={`${base}/producto/${product.slug}`}
                  className="mt-auto inline-flex h-9 items-center justify-center rounded-lg bg-background text-xs font-medium text-foreground hover:bg-surface-soft"
                >
                  Ver producto
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
