"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  clearCart,
  getCartSnapshot,
  removeFromCart,
  setCartQuantity,
  subscribeCart,
  writeCart,
  type CartItem,
} from "@/lib/store/cart";
import type { CartValidation } from "@/lib/store/service";

type Props = { tenantId: string; tenantSlug: string; whatsappConfigured: boolean };

const EMPTY: CartValidation = { lines: [], issues: [], invalidVariantIds: [], subtotal: "0.00" };
const EMPTY_ITEMS: CartItem[] = [];

export function CartView({ tenantId, tenantSlug, whatsappConfigured }: Props) {
  const items = useSyncExternalStore(
    subscribeCart,
    () => getCartSnapshot(tenantId),
    () => EMPTY_ITEMS,
  );
  const [validation, setValidation] = useState<CartValidation>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `/tienda/${tenantSlug}`;

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      setLoading(true);
      try {
        const response = await fetch(`/api/store/${tenantSlug}/cart/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = (await response.json()) as CartValidation;
        if (cancelled) return;
        setValidation(data);
        if (data.invalidVariantIds?.length) {
          const invalid = new Set(data.invalidVariantIds);
          writeCart(tenantId, items.filter((item) => !invalid.has(item.variantId)));
        }
      } catch {
        if (!cancelled) setError("No se pudo validar el carrito");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    refresh();
    return () => { cancelled = true; };
  }, [items, tenantId, tenantSlug]);

  function changeQuantity(variantId: string, quantity: number) {
    setCartQuantity(tenantId, variantId, quantity);
  }

  function remove(variantId: string) {
    removeFromCart(tenantId, variantId);
  }

  async function sendWhatsapp() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/store/${tenantSlug}/whatsapp/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await response.json()) as { url?: string; error?: string; validation?: CartValidation };
      if (!response.ok || !data.url) {
        setError(data.error ?? "No se pudo preparar la consulta");
        if (data.validation) setValidation(data.validation);
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  const totalUnits = validation.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-12">
      <nav className="mb-6 flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
        <Link href={base} className="hover:text-primary">Inicio</Link>
        <Icon name="chevronRight" size={13} />
        <span className="font-semibold text-foreground">Carrito</span>
      </nav>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tu carrito</h1>
        <Link href={base} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <Icon name="arrowLeft" size={16} /> Seguir comprando
        </Link>
      </div>

      {validation.issues.length ? (
        <div role="alert" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {validation.issues.map((issue, index) => <p key={index}>{issue}</p>)}
          <p className="mt-1">Los artículos no disponibles se quitaron automáticamente. Revise los precios vigentes.</p>
        </div>
      ) : null}
      {error ? <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <Icon name="bag" size={28} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold">Tu carrito está vacío</p>
          <p className="mt-1 text-xs text-muted">Agrega productos desde el catálogo para consultarlos por WhatsApp.</p>
          <Link href={base} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Ver catálogo</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="flex flex-col gap-4 lg:col-span-8">
            {validation.lines.map((line) => (
              <article key={line.variantId} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-background">
                    {line.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.imageUrl} alt={line.productName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-slate-300"><Icon name="image" size={22} /></span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <Link href={`${base}/producto/${line.productSlug}`} className="block truncate text-sm font-semibold hover:text-primary">{line.productName}</Link>
                    <p className="text-xs text-muted">Variante: {line.variantName}</p>
                    <p className="mt-1 inline-block rounded bg-background px-2 py-0.5 font-mono text-[10px] text-muted">SKU: {line.sku}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <div className="flex items-center rounded-lg border border-border bg-background p-1">
                    <button type="button" aria-label="Disminuir" onClick={() => changeQuantity(line.variantId, line.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-soft"><Icon name="minus" size={15} /></button>
                    <span className="w-9 text-center text-sm font-semibold">{line.quantity}</span>
                    <button type="button" aria-label="Aumentar" onClick={() => changeQuantity(line.variantId, line.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded hover:bg-surface-soft"><Icon name="plus" size={15} /></button>
                  </div>
                  <div className="min-w-20 text-right">
                    <span className="block text-sm font-bold">S/ {line.lineTotal}</span>
                    <span className="block text-[10px] text-muted">S/ {line.unitPrice} c/u</span>
                  </div>
                  <button type="button" onClick={() => remove(line.variantId)} title="Quitar artículo" className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><Icon name="trash" size={18} /></button>
                </div>
              </article>
            ))}
            <button type="button" onClick={() => { clearCart(tenantId); setValidation(EMPTY); }} className="self-start text-xs font-medium text-muted hover:text-red-600">
              Vaciar carrito
            </button>
          </section>

          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded-xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold">Resumen del carrito</h2>
              <div className="flex items-center justify-between text-sm text-muted">
                <span>{totalUnits} {totalUnits === 1 ? "producto" : "productos"}</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold">Subtotal referencial</span>
                <span className="text-xl font-bold">S/ {validation.subtotal}</span>
              </div>
              <div className="mt-4 flex gap-2.5 rounded-lg bg-background p-3 text-xs text-muted">
                <Icon name="bag" size={18} className="shrink-0 text-primary" />
                <p>El envío se confirma por WhatsApp según tu ubicación. Los precios se validan con el servidor.</p>
              </div>
              <button
                type="button"
                onClick={sendWhatsapp}
                disabled={!whatsappConfigured || busy || loading || validation.lines.length === 0}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="whatsapp" size={19} /> {busy ? "Preparando…" : "Enviar carrito por WhatsApp"}
              </button>
              {!whatsappConfigured ? (
                <p className="mt-3 text-center text-xs text-amber-700">La consulta por WhatsApp todavía no está disponible en esta tienda.</p>
              ) : (
                <p className="mt-3 text-center text-xs text-muted">Se abrirá un mensaje con tus productos. Revísalo y toca Enviar en WhatsApp.</p>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className="mt-10 border-t border-border pt-5 text-xs text-muted">
        Agregar artículos al carrito no crea pedidos ni reserva stock.
      </div>
    </div>
  );
}
