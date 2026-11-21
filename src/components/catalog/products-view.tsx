"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { CategoryDTO, ProductDTO } from "@/lib/catalog/service";

type Filters = { q?: string; categoryId?: string; visible?: string; status?: string };

type FlowStatus = { status: "none" | "draft" | "published" | "changes"; flowId?: string };
type Props = {
  products: ProductDTO[];
  categories: CategoryDTO[];
  filters: Filters;
  canArchive: boolean;
  flowStatus: Record<string, FlowStatus>;
};

export function ProductsView({ products, categories, filters, canArchive, flowStatus }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? "");
  const [categoryId, setCategoryId] = useState(filters.categoryId ?? "");
  const [visible, setVisible] = useState(filters.visible ?? "");
  const [showCreate, setShowCreate] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openFlow(productId: string) {
    setBusy(productId);
    setError(null);
    try {
      const response = await fetch("/api/admin/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = (await response.json()) as { flow?: { id: string }; error?: string };
      if (!response.ok || !data.flow) {
        if (response.status === 409) {
          const list = await fetch("/api/admin/flows?scope=PRODUCT");
          const payload = (await list.json()) as { flows: { id: string; productId: string | null }[] };
          const existing = payload.flows.find((item) => item.productId === productId);
          if (existing) { router.push(`/dashboard/flows/${existing.id}`); return; }
        }
        setError(data.error ?? "No se pudo abrir el flujo");
        return;
      }
      router.push(`/dashboard/flows/${data.flow.id}`);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(null);
    }
  }

  function applyFilters(next: Partial<Filters>) {
    const params = new URLSearchParams();
    const merged = { q, categoryId, visible, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.categoryId) params.set("categoryId", merged.categoryId);
    if (merged.visible) params.set("visible", merged.visible);
    router.replace(params.size ? `/dashboard/products?${params.toString()}` : "/dashboard/products");
  }

  async function patchProduct(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "No se pudo actualizar el producto");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Productos</h1>
          <span className="rounded-full bg-surface-soft px-2.5 py-0.5 text-xs text-muted">
            {products.length} {products.length === 1 ? "producto en catálogo" : "productos en catálogo"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCategory(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm hover:bg-background"
          >
            <Icon name="folder" size={17} className="text-muted" /> Categorías
          </button>
          <button
            type="button"
            disabled
            title="Disponible en una fase posterior"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted"
          >
            <Icon name="upload" size={17} /> Exportar
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover"
          >
            <Icon name="plus" size={17} /> Nuevo producto
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && applyFilters({ q })}
            placeholder="Buscar por nombre o SKU"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              applyFilters({ categoryId: event.target.value });
            }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            value={visible}
            onChange={(event) => {
              setVisible(event.target.value);
              applyFilters({ visible: event.target.value });
            }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Todas las visibilidades</option>
            <option value="visible">Visible en tienda</option>
            <option value="hidden">Oculto</option>
          </select>
          <button
            type="button"
            onClick={() => applyFilters({ q })}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted"
          >
            <Icon name="filter" size={16} /> Aplicar
          </button>
        </div>
      </div>

      {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 text-right font-semibold">Precio</th>
                <th className="px-4 py-3 font-semibold">Visibilidad</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Flujo</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <p className="font-semibold">No hay productos para mostrar</p>
                    <p className="mt-1 text-xs text-muted">Crea el primero con el botón «Nuevo producto».</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-background/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-muted">
                          {product.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.coverUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <Icon name="image" size={20} />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <Link href={`/dashboard/products/${product.id}`} className="truncate font-semibold hover:text-primary">
                            {product.name}
                          </Link>
                          <span className="truncate font-mono text-xs text-muted">
                            {product.mainSku ?? "—"} · {product.variantCount} {product.variantCount === 1 ? "variante" : "variantes"}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-background px-2 py-0.5 text-xs text-muted">
                        {product.categoryName ?? "Sin categoría"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {product.priceFrom ? `S/ ${product.priceFrom}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busy === product.id}
                        onClick={() => patchProduct(product.id, { storeVisible: !product.storeVisible })}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.storeVisible ? "bg-emerald-50 text-emerald-700" : "bg-surface-soft text-muted"
                        }`}
                      >
                        <Icon name={product.storeVisible ? "check" : "eyeOff"} size={14} />
                        {product.storeVisible ? "Visible en web" : "Oculto"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        product.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" :
                        product.status === "ARCHIVED" ? "bg-surface-soft text-muted" : "bg-amber-50 text-amber-700"
                      }`}>
                        {product.status === "ACTIVE" ? "Activo" : product.status === "ARCHIVED" ? "Archivado" : "Borrador"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const flow = flowStatus[product.id];
                        if (!flow || flow.status === "none") return <span className="text-xs text-muted">Sin flujo</span>;
                        const labels = { draft: "Borrador", published: "Publicado", changes: "Cambios sin publicar" };
                        return <span className={`rounded-full px-2 py-0.5 text-[11px] ${flow.status === "published" ? "bg-emerald-50 text-emerald-700" : flow.status === "changes" ? "bg-amber-50 text-amber-700" : "bg-surface-soft text-muted"}`}>{labels[flow.status]}</span>;
                      })()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busy === product.id}
                          onClick={() => openFlow(product.id)}
                          title={flowStatus[product.id]?.flowId ? "Abrir flujo" : "Crear flujo"}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
                        >
                          <Icon name="split" size={14} />
                          {flowStatus[product.id]?.flowId ? "Abrir flujo" : "Crear flujo"}
                        </button>
                        {canArchive ? (
                          <button
                            type="button"
                            disabled={busy === product.id}
                            onClick={() => patchProduct(product.id, {
                              status: product.status === "ARCHIVED" ? "DRAFT" : "ARCHIVED",
                            })}
                            title={product.status === "ARCHIVED" ? "Restaurar" : "Archivar"}
                            className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-foreground"
                          >
                            <Icon name="archive" size={17} />
                          </button>
                        ) : null}
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          title="Editar producto"
                          className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-primary"
                        >
                          <Icon name="edit" size={17} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between bg-background px-5 py-3 text-xs text-muted">
          <span>Mostrando {products.length} de {products.length} productos</span>
          <span>Orden: más recientes</span>
        </div>
      </section>

      {showCreate ? <CreateProductDialog categories={categories} onClose={() => setShowCreate(false)} /> : null}
      {showCategory ? <CreateCategoryDialog onClose={() => setShowCategory(false)} /> : null}
    </div>
  );
}

function CreateProductDialog({ categories, onClose }: { categories: CategoryDTO[]; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", categoryId: "", description: "", price: "", variantName: "Predeterminada", variantSku: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "No se pudo crear el producto"); return; }
      onClose();
      router.refresh();
    } catch { setError("No se pudo conectar con el servidor"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog title="Nuevo producto" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nombre del producto">
          <input required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Categoría">
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputClass}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Precio de la variante (S/)">
            <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Nombre de variante">
            <input value={form.variantName} onChange={(e) => setForm({ ...form, variantName: e.target.value })} className={inputClass} />
          </Field>
          <Field label="SKU (opcional)">
            <input value={form.variantSku} onChange={(e) => setForm({ ...form, variantSku: e.target.value })} className={inputClass} />
          </Field>
        </div>
        <Field label="Descripción">
          <textarea rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
        </Field>
        {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Creando…" : "Crear producto"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function CreateCategoryDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "No se pudo crear la categoría");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog title="Nueva categoría" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nombre">
          <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Crear</button>
        </div>
      </form>
    </Dialog>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
