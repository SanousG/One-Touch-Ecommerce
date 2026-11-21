"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Field, inputClass } from "./products-view";
import { ImageManager } from "./image-manager";
import { VariantManager } from "./variant-manager";
import type { CategoryDTO, ProductDTO } from "@/lib/catalog/service";

type Props = { product: ProductDTO; categories: CategoryDTO[]; canArchive: boolean };

export function ProductEditor({ product: initial, categories, canArchive }: Props) {
  const [product, setProduct] = useState(initial);
  const [form, setForm] = useState({
    name: initial.name,
    categoryId: initial.categoryId ?? "",
    description: initial.description ?? "",
    status: initial.status as ProductDTO["status"],
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { product?: ProductDTO; error?: string };
      if (!response.ok || !data.product) {
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      setProduct(data.product);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility() {
    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeVisible: !product.storeVisible }),
    });
    const data = (await response.json()) as { product?: ProductDTO; error?: string };
    if (data.product) setProduct(data.product);
    else setError(data.error ?? "No se pudo cambiar la visibilidad");
  }

  const defaultVariant = product.variants.find((variant) => variant.isDefault) ?? product.variants[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-muted">
            <Link href="/dashboard/products" className="hover:text-primary">Productos</Link>
            <Icon name="chevronRight" size={13} />
            <span className="text-foreground">{product.name}</span>
          </nav>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Editar producto</h1>
            <span className="rounded-full bg-surface-soft px-2 py-0.5 font-mono text-xs text-muted">
              {defaultVariant ? `SKU: ${defaultVariant.sku}` : "Sin SKU"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="La ficha pública se implementará en la Fase 2B"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm text-muted"
          >
            Ver ficha pública <Icon name="chevronRight" size={15} />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            <Icon name="check" size={17} /> {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </header>

      {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Cambios guardados correctamente.</p> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Icon name="box" size={20} className="text-primary" />
              <h2 className="text-sm font-semibold">Información básica del producto</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nombre del producto">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field label="Categoría">
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputClass}>
                  <option value="">Sin categoría</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </Field>
              <Field label="Precio base de venta">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    readOnly
                    value={defaultVariant?.price ?? ""}
                    className={`${inputClass} cursor-default pl-9`}
                  />
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descripción">
                  <textarea rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field label="Estado">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProductDTO["status"] })}
                  className={inputClass}
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="ACTIVE">Activo</option>
                  {canArchive ? <option value="ARCHIVED">Archivado</option> : null}
                </select>
              </Field>
            </div>
            <p className="mt-3 text-[11px] text-muted">
              El precio base corresponde a la variante predeterminada. Edítalo desde «Variantes» y guarda los cambios.
            </p>
          </section>

          <ImageManager product={product} onUpdated={setProduct} />
          <VariantManager product={product} onUpdated={setProduct} />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-4">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold">Visibilidad en tienda</h2>
            <p className="mb-4 text-xs leading-relaxed text-muted">
              Controla si el producto aparecerá en la tienda pública cuando ese módulo esté disponible.
            </p>
            <div className="flex items-center justify-between rounded-lg bg-background p-2.5">
              <span className="text-xs font-medium">Estado de publicación</span>
              <button
                type="button"
                onClick={toggleVisibility}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${product.storeVisible ? "bg-primary text-white" : "bg-surface text-muted"}`}
              >
                {product.storeVisible ? "Visible" : "Oculto"}
              </button>
            </div>
          </section>

          <UnavailableCard
            icon="sort"
            title="Flujo de venta (bot)"
            description="El editor visual de flujos y la integración con WhatsApp se implementarán en una fase posterior. Esta sección no modifica el catálogo."
          />
          <UnavailableCard
            icon="warehouse"
            title="Inventario vinculado"
            description="El stock físico y reservado se gestionará en el módulo de inventario. Disponible neto por variante: "
            value={product.variants.reduce((sum, v) => sum + v.stockAvailable, 0).toString()}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
        <span>Los cambios se guardan al presionar «Guardar cambios».</span>
        <Link href="/dashboard/products" className="font-medium text-primary hover:underline">Volver al listado</Link>
      </div>
    </div>
  );
}

function UnavailableCard({
  icon,
  title,
  description,
  value,
}: {
  icon: "sort" | "warehouse";
  title: string;
  description: string;
  value?: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Icon name={icon} size={18} className="text-slate-400" />
      </div>
      <p className="text-xs leading-relaxed text-muted">{description}{value ? <strong className="text-foreground"> {value} uds.</strong> : null}</p>
      <button type="button" disabled className="mt-3 w-full rounded-lg bg-surface-soft py-2 text-xs font-medium text-muted">
        No disponible en esta fase
      </button>
    </section>
  );
}
