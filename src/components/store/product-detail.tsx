"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { addToCart } from "@/lib/store/cart";
import type { StoreProductDTO } from "@/lib/store/service";

type Props = {
  product: StoreProductDTO;
  tenantId: string;
  tenantSlug: string;
  whatsappConfigured: boolean;
};

export function ProductDetail({ product, tenantId, tenantSlug, whatsappConfigured }: Props) {
  const [imageIndex, setImageIndex] = useState(0);
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `/tienda/${tenantSlug}`;
  const variant = product.variants.find((item) => item.id === variantId);

  async function askWhatsapp() {
    if (!variant) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/store/${tenantSlug}/whatsapp/product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, quantity }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setStatus(data.error ?? "No se pudo preparar la consulta");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setStatus("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-12">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Link href={base} className="hover:text-primary">Inicio</Link>
        <Icon name="chevronRight" size={13} />
        <span>{product.categoryName ?? "Producto"}</span>
        <Icon name="chevronRight" size={13} />
        <span className="font-medium text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-background">
            {product.images[imageIndex] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[imageIndex].url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-slate-300"><Icon name="image" size={40} /></span>
            )}
          </div>
          {product.images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  aria-label={`Ver imagen ${index + 1}`}
                  className={`h-20 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-background ${index === imageIndex ? "border-primary" : "border-transparent"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-5 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{product.categoryName ?? "Producto"}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{product.name}</h1>
            <p className="mt-2 text-2xl font-bold">{variant ? `S/ ${variant.price}` : product.priceLabel}</p>
            <p className="text-xs text-muted">{variant ? "Precio por unidad" : "Sin variantes activas"}</p>
          </div>

          {product.description ? (
            <p className="text-sm leading-relaxed text-muted">{product.description}</p>
          ) : null}

          {product.variants.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {product.variants.length === 1 ? "Presentación" : "Variante"}
              </p>
              {product.variants.length === 1 ? (
                <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  {product.variants[0].name} <span className="text-muted">· SKU {product.variants[0].sku}</span>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setVariantId(item.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs ${item.id === variantId ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-background"}`}
                    >
                      <span className="block font-semibold">{item.name}</span>
                      <span className="block text-muted">S/ {item.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Cantidad</span>
            <div className="flex items-center rounded-lg border border-border bg-background p-1">
              <button type="button" aria-label="Disminuir" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-soft">
                <Icon name="minus" size={16} />
              </button>
              <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
              <button type="button" aria-label="Aumentar" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-soft">
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={!variant}
              onClick={() => {
                if (!variant) return;
                addToCart(tenantId, variant.id, quantity);
                setStatus(`Agregado al carrito: ${quantity} ${quantity === 1 ? "unidad" : "unidades"}`);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-semibold hover:bg-background disabled:opacity-50"
            >
              <Icon name="bag" size={19} className="text-primary" /> Agregar al carrito
            </button>
            <button
              type="button"
              disabled={!variant || !whatsappConfigured || busy}
              onClick={askWhatsapp}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="whatsapp" size={19} /> {busy ? "Preparando…" : "Hablar por WhatsApp"}
            </button>
            {!whatsappConfigured ? (
              <p className="text-center text-xs text-amber-700">La consulta por WhatsApp todavía no está disponible en esta tienda.</p>
            ) : (
              <p className="text-center text-xs text-muted">Se abrirá un chat con un mensaje listo; revísalo y toca Enviar.</p>
            )}
            {status ? <p role="status" className="text-center text-xs font-medium text-primary">{status}</p> : null}
          </div>

          <div className="rounded-xl bg-background p-4 text-xs leading-relaxed text-muted">
            <p className="font-semibold text-foreground">Compra por WhatsApp</p>
            <p className="mt-1">La disponibilidad, el envío y la forma de pago se confirman directamente con la tienda. Agregar al carrito no crea pedidos ni reserva stock.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
