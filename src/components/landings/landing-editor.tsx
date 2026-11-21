"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { LandingView } from "./landing-view";
import { inputClass } from "@/components/catalog/products-view";
import type { FaqDTO, LandingContentDTO, LandingDTO } from "@/lib/landings/service";
import type { ProductDTO } from "@/lib/catalog/service";
import type { StoreProductDTO, StoreTenantDTO } from "@/lib/store/service";

function adminToStoreProduct(product: ProductDTO): StoreProductDTO {
  const prices = product.variants.map((variant) => variant.price);
  const label = !product.priceFrom
    ? "Consultar precio"
    : new Set(prices).size > 1
      ? `Desde S/ ${product.priceFrom}`
      : `S/ ${product.priceFrom}`;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: product.categoryName,
    coverUrl: product.coverUrl,
    images: product.images.map((image) => ({ id: image.id, url: image.url })),
    priceFrom: product.priceFrom,
    priceLabel: label,
    variantCount: product.variantCount,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      price: variant.price,
      isDefault: variant.isDefault,
    })),
  };
}

type Props = { landing: LandingDTO; product: ProductDTO; tenant: StoreTenantDTO; canPublish: boolean };

export function LandingEditor({ landing, product, tenant, canPublish }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<LandingContentDTO>({
    headline: landing.draft.headline,
    summary: landing.draft.summary,
    heroImageId: landing.draft.heroImageId,
    benefits: landing.draft.benefits,
    faqs: landing.draft.faqs,
  });
  const [revision, setRevision] = useState(landing.draft.revision);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof LandingContentDTO>(key: K, value: LandingContentDTO[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/landings/${landing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expectedRevision: revision }),
      });
      const data = (await response.json()) as { error?: string; landing?: LandingDTO };
      if (!response.ok || !data.landing) { setError(data.error ?? "No se pudo guardar"); return; }
      setRevision(data.landing.draft.revision);
      setForm({
        headline: data.landing.draft.headline,
        summary: data.landing.draft.summary,
        heroImageId: data.landing.draft.heroImageId,
        benefits: data.landing.draft.benefits,
        faqs: data.landing.draft.faqs,
      });
      setStatus("Borrador guardado. La versión pública no se ha cambiado.");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/landings/${landing.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: revision }),
      });
      const data = (await response.json()) as { error?: string; landing?: LandingDTO };
      if (!response.ok || !data.landing) { setError(data.error ?? "No se pudo publicar"); return; }
      setRevision(data.landing.draft.revision);
      setStatus("Cambios publicados correctamente.");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-muted">
            <Link href="/dashboard/landings" className="hover:text-primary">Tienda y landings</Link>
            <Icon name="chevronRight" size={13} />
            <span className="text-foreground">{landing.productName}</span>
          </nav>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Editar landing</h1>
            {landing.hasUnpublishedChanges ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Cambios sin publicar</span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Publicada</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {landing.publicUrl ? (
            <Link href={landing.publicUrl} target="_blank" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted hover:bg-background hover:text-primary">
              Ver versión pública <Icon name="chevronRight" size={14} />
            </Link>
          ) : null}
          <Link href={`/dashboard/landings/${landing.id}/preview`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm">
            <Icon name="eye" size={16} /> Vista previa
          </Link>
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50">
            <Icon name="check" size={16} /> Guardar borrador
          </button>
          <button type="button" onClick={publish} disabled={saving || !canPublish} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <Icon name="rocket" size={16} /> Publicar cambios
          </button>
        </div>
      </div>

      {!canPublish ? (
        <p className="rounded-lg bg-background px-4 py-2 text-xs text-muted">Tu rol (OPERATOR) permite guardar borradores. Solo el OWNER puede publicar.</p>
      ) : null}
      {error ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
      {status ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{status}</p> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <LinkedProduct product={product} />

          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">Contenido de la landing</h2>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Titular principal (H1)</span>
                <input value={form.headline} maxLength={120} onChange={(event) => update("headline", event.target.value)} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Descripción breve</span>
                <textarea value={form.summary} rows={3} maxLength={600} onChange={(event) => update("summary", event.target.value)} className={inputClass} />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Fotografía principal</span>
                <div className="grid grid-cols-3 gap-2">
                  {product.images.length === 0 ? (
                    <p className="col-span-3 text-xs text-muted">Este producto no tiene imágenes en el catálogo.</p>
                  ) : product.images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => update("heroImageId", image.id)}
                      title="Usar como fotografía principal"
                      className={`aspect-square overflow-hidden rounded-lg border-2 ${form.heroImageId === image.id ? "border-primary" : "border-transparent"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted">Beneficios (máximo 6)</span>
                {form.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={benefit}
                      onChange={(event) => {
                        const next = [...form.benefits];
                        next[index] = event.target.value;
                        update("benefits", next);
                      }}
                      className={inputClass}
                    />
                    <button type="button" onClick={() => update("benefits", form.benefits.filter((_, i) => i !== index))} className="rounded p-1.5 text-muted hover:text-red-600" title="Quitar beneficio">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={form.benefits.length >= 6}
                  onClick={() => update("benefits", [...form.benefits, ""])}
                  className="self-start text-xs font-medium text-primary disabled:text-slate-300"
                >
                  + Añadir beneficio
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted">Preguntas frecuentes (máximo 8)</span>
                {form.faqs.map((faq, index) => (
                  <div key={index} className="rounded-lg border border-border bg-background p-3">
                    <input
                      value={faq.question}
                      placeholder="Pregunta"
                      onChange={(event) => {
                        const next = [...form.faqs];
                        next[index] = { ...faq, question: event.target.value };
                        update("faqs", next);
                      }}
                      className={inputClass}
                    />
                    <textarea
                      value={faq.answer}
                      placeholder="Respuesta"
                      rows={2}
                      onChange={(event) => {
                        const next = [...form.faqs];
                        next[index] = { ...faq, answer: event.target.value };
                        update("faqs", next);
                      }}
                      className={`${inputClass} mt-2`}
                    />
                    <button type="button" onClick={() => update("faqs", form.faqs.filter((_, i) => i !== index))} className="mt-2 text-xs text-muted hover:text-red-600">
                      Quitar pregunta
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={form.faqs.length >= 8}
                  onClick={() => update("faqs", [...form.faqs, { question: "", answer: "" } as FaqDTO])}
                  className="self-start text-xs font-medium text-primary disabled:text-slate-300"
                >
                  + Añadir pregunta
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-7">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>Vista previa del borrador</span>
            <span>No visible para clientes</span>
          </div>
          <div className="max-h-[900px] overflow-y-auto rounded-xl border border-border shadow-sm">
            <LandingView tenant={tenant} product={adminToStoreProduct(product)} content={form} mode="preview" landingSlug={landing.slug} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedProduct({ product }: { product: ProductDTO }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Producto vinculado</span>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Sincronizado</span>
      </div>
      <div className="flex items-center gap-3 rounded-lg bg-background p-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
          {product.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : <Icon name="image" size={20} className="text-slate-300" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{product.name}</span>
          <span className="block text-xs text-primary">{product.priceFrom ? `S/ ${product.priceFrom}` : "Consultar precio"}</span>
          <span className="block text-[11px] text-muted">Datos de solo lectura del catálogo</span>
        </span>
      </div>
    </section>
  );
}
