"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import type { LandingDTO } from "@/lib/landings/service";
import type { ProductDTO } from "@/lib/catalog/service";

type Props = { landings: LandingDTO[]; products: ProductDTO[] };

export function LandingList({ landings, products }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyLink(url: string | null, id: string) {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${url}`);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tienda y landings</h1>
          <p className="mt-1 text-xs text-muted">Páginas de producto para compartir en tus canales.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          disabled={products.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Icon name="plus" size={17} /> Nueva landing
        </button>
      </div>

      {products.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Crea un producto en el catálogo antes de generar una landing.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {landings.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Icon name="link" size={26} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold">Todavía no hay landings</p>
            <p className="mt-1 text-xs text-muted">Selecciona un producto para crear la primera.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Slug público</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {landings.map((landing) => (
                <tr key={landing.id} className="hover:bg-background/60">
                  <td className="px-5 py-3 font-medium">{landing.productName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{landing.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      landing.isPublished
                        ? landing.hasUnpublishedChanges
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                        : "bg-surface-soft text-muted"
                    }`}>
                      {!landing.isPublished ? "Sin publicar" : landing.hasUnpublishedChanges ? "Cambios sin publicar" : "Publicada"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {landing.publicUrl ? (
                        <button
                          type="button"
                          onClick={() => copyLink(landing.publicUrl, landing.id)}
                          title="Copiar enlace público"
                          className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-primary"
                        >
                          <Icon name={copied === landing.id ? "check" : "copy"} size={16} />
                        </button>
                      ) : null}
                      <Link href={`/preview/landing/${landing.id}`} target="_blank" title="Vista previa privada" className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-primary">
                        <Icon name="eye" size={17} />
                      </Link>
                      <Link href={`/dashboard/landings/${landing.id}`} title="Editar landing" className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-primary">
                        <Icon name="edit" size={17} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showCreate ? (
        <CreateLandingDialog products={products} onClose={() => setShowCreate(false)} />
      ) : null}
    </div>
  );
}

function CreateLandingDialog({ products, onClose }: { products: ProductDTO[]; onClose: () => void }) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [slug, setSlug] = useState("");
  const [headline, setHeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/landings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          ...(slug.trim() ? { slug: slug.trim() } : {}),
          ...(headline.trim() ? { headline: headline.trim() } : {}),
        }),
      });
      const data = (await response.json()) as { error?: string; landing?: { id: string } };
      if (!response.ok || !data.landing) { setError(data.error ?? "No se pudo crear la landing"); return; }
      onClose();
      router.push(`/dashboard/landings/${data.landing.id}`);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg space-y-3 rounded-xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Nueva landing</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Producto</span>
          <select value={productId} onChange={(event) => setProductId(event.target.value)} className={inputClass}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Slug público (opcional)</span>
          <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="Ej. mouse-logitech-x2" className={inputClass} />
          <span className="text-[11px] text-muted">Es la parte final de la dirección de la landing. Si lo dejas vacío, se genera desde el producto.</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Titular inicial (opcional)</span>
          <input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Ej. Mouse Logitech X2 con envío gratis" className={inputClass} />
          <span className="text-[11px] text-muted">Es el texto grande que verá el cliente. Si lo dejas vacío, se usa el nombre del producto.</span>
        </label>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={saving || !productId} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Creando…" : "Crear landing"}
          </button>
        </div>
      </form>
    </div>
  );
}
