"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import type { FlowDTO } from "@/lib/flows/types";
import type { ProductDTO } from "@/lib/catalog/service";

type Props = { flows: FlowDTO[]; products: ProductDTO[] };

function statusOf(flow: FlowDTO) {
  if (!flow.isPublished) return { label: "Borrador", className: "bg-surface-soft text-muted" };
  if (flow.hasUnpublishedChanges) return { label: "Cambios sin publicar", className: "bg-amber-50 text-amber-700" };
  return { label: "Publicado", className: "bg-emerald-50 text-emerald-700" };
}

export function FlowsList({ flows, products }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const status = statusOf;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flujos de venta</h1>
          <p className="mt-1 text-xs text-muted">Diagramas de conversación por producto y flujos globales reutilizables.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/templates" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm">
            <Icon name="chat" size={16} /> Plantillas
          </Link>
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
            <Icon name="plus" size={17} /> Nuevo flujo
          </button>
        </div>
      </div>

      {flows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <Icon name="split" size={26} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold">Todavía no hay flujos</p>
          <p className="mt-1 text-xs text-muted">Cree uno desde un producto o como flujo global reutilizable.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Flujo</th>
                <th className="px-4 py-3 font-semibold">Ámbito</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {flows.map((flow) => {
                const item = status(flow);
                return (
                  <tr key={flow.id} className="hover:bg-background/60">
                    <td className="px-5 py-3">
                      <p className="font-medium">{flow.name}</p>
                      <p className="font-mono text-xs text-muted">{flow.slug} · v{flow.version.version}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{flow.scope === "GLOBAL" ? "Global" : flow.productName ?? "Producto"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.className}`}>{item.label}</span></td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/dashboard/flows/${flow.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        Abrir editor <Icon name="chevronRight" size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {showCreate ? <CreateFlowDialog products={products} onClose={() => setShowCreate(false)} /> : null}
    </div>
  );
}

function CreateFlowDialog({ products, onClose }: { products: ProductDTO[]; onClose: () => void }) {
  const router = useRouter();
  const [scope, setScope] = useState<"PRODUCT" | "GLOBAL">("PRODUCT");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, productId: scope === "PRODUCT" ? productId : undefined, name, description }),
      });
      const data = (await response.json()) as { error?: string; flow?: { id: string } };
      if (!response.ok || !data.flow) { setError(data.error ?? "No se pudo crear el flujo"); return; }
      onClose();
      router.push(`/dashboard/flows/${data.flow.id}`);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg space-y-3 rounded-xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Nuevo flujo de venta</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Tipo</span>
          <select value={scope} onChange={(event) => setScope(event.target.value as "PRODUCT" | "GLOBAL")} className={inputClass}>
            <option value="PRODUCT">Flujo de producto</option>
            <option value="GLOBAL">Flujo global reutilizable</option>
          </select>
        </label>
        {scope === "PRODUCT" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Producto</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)} className={inputClass}>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Nombre del flujo global</span>
            <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Descripción (opcional)</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
        </label>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={saving || (scope === "PRODUCT" && !productId)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Creando…" : "Crear flujo"}
          </button>
        </div>
      </form>
    </div>
  );
}
