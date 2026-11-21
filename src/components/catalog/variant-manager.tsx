"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Field, inputClass } from "./products-view";
import type { ProductDTO } from "@/lib/catalog/service";

type Props = { product: ProductDTO; onUpdated: (product: ProductDTO) => void };

export function VariantManager({ product, onUpdated }: Props) {
  const [newVariant, setNewVariant] = useState({ name: "", sku: "", price: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(url: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { product?: ProductDTO; error?: string };
      if (!response.ok || !data.product) {
        setError(data.error ?? "No se pudo actualizar la variante");
        return;
      }
      onUpdated(data.product);
      setNewVariant({ name: "", sku: "", price: "" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="tag" size={20} className="text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Variantes</h2>
            <p className="text-xs text-muted">{product.variants.length} registradas</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {product.variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            busy={busy}
            onSave={(body) =>
              send(`/api/admin/products/${product.id}/variants/${variant.id}`, "PATCH", body)
            }
          />
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background p-3">
        <p className="mb-2 text-xs font-semibold">Nueva variante</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input placeholder="Nombre" value={newVariant.name} onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })} className={inputClass} />
          <input placeholder="SKU" value={newVariant.sku} onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })} className={inputClass} />
          <input type="number" step="0.01" min="0" placeholder="Precio" value={newVariant.price} onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })} className={inputClass} />
        </div>
        <button
          type="button"
          disabled={busy || !newVariant.name || !newVariant.price}
          onClick={() => send(`/api/admin/products/${product.id}/variants`, "POST", newVariant)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Icon name="plus" size={15} /> Agregar variante
        </button>
      </div>

      <p className="mt-3 text-[11px] text-muted">
        El stock físico y reservado se administra en Inventario (fase posterior). Aquí solo se muestra el disponible calculado.
      </p>
      {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}

function VariantRow({
  variant,
  busy,
  onSave,
}: {
  variant: ProductDTO["variants"][number];
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(variant.name);
  const [sku, setSku] = useState(variant.sku);
  const [price, setPrice] = useState(variant.price);

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="SKU">
          <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Precio (S/)">
          <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="flex items-center gap-2 sm:pt-5">
        <span className="rounded-full bg-surface-soft px-2 py-1 text-[11px] text-muted">
          {variant.stockAvailable} uds. disponibles
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave({ name, sku, price, isActive: !variant.isActive })}
          title={variant.isActive ? "Desactivar variante" : "Activar variante"}
          className={`rounded-full px-2 py-1 text-[11px] font-medium ${variant.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
        >
          {variant.isActive ? "Activa" : "Inactiva"}
        </button>
        <button
          type="button"
          disabled={busy || (name === variant.name && sku === variant.sku && price === variant.price)}
          onClick={() => onSave({ name, sku, price })}
          className="rounded-lg bg-surface px-3 py-2 text-xs font-semibold text-primary shadow-sm disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
