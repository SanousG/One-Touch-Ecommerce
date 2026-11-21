import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { LandingWhatsappButton } from "./landing-whatsapp-button";
import type { LandingContentDTO } from "@/lib/landings/service";
import type { StoreProductDTO, StoreTenantDTO } from "@/lib/store/service";

type Props = {
  tenant: StoreTenantDTO;
  product: StoreProductDTO;
  content: LandingContentDTO;
  mode: "public" | "preview";
  landingSlug: string;
};

export function LandingView({ tenant, product, content, mode, landingSlug }: Props) {
  const isPreview = mode === "preview";
  const imageUrl = content.heroImageId
    ? isPreview
      ? `/api/admin/products/images/${content.heroImageId}/file`
      : `/api/images/${content.heroImageId}/file`
    : product.coverUrl;
  const storeUrl = `/tienda/${tenant.slug}`;
  const whatsappEnabled = !isPreview && Boolean(tenant.whatsappPhone);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-foreground">
      {isPreview ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          Vista previa privada del borrador · no visible para clientes
        </div>
      ) : null}

      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <span className="text-base font-bold tracking-tight">{tenant.name}</span>
          {isPreview ? (
            <span className="cursor-not-allowed text-sm text-muted">Ver tienda</span>
          ) : (
            <Link href={storeUrl} className="text-sm text-muted hover:text-primary">Ver tienda</Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        <div className="border-b border-border bg-background/70">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2 text-xs">
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-semibold uppercase tracking-wider text-primary">
              Tienda oficial
            </span>
            <span className="font-mono uppercase tracking-wider text-muted">
              Ref. {product.variants[0]?.sku ?? product.slug}
            </span>
          </div>
        </div>

        <section className="mx-auto w-full max-w-6xl px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">{product.name}</p>
              <h1 className="text-3xl font-bold leading-tight tracking-tight lg:text-5xl">{content.headline}</h1>
              <p className="max-w-lg text-base leading-relaxed text-muted lg:text-lg">{content.summary}</p>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-sm uppercase tracking-wider text-muted">Precio</span>
                <span className="text-3xl font-bold text-primary lg:text-4xl">{product.priceLabel}</span>
              </div>

              <LandingWhatsappButton
                tenantSlug={tenant.slug}
                landingSlug={landingSlug}
                enabled={whatsappEnabled}
              />

              {product.variants.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {product.variants.map((variant) => (
                    <span key={variant.id} className="rounded-md bg-background px-2.5 py-1 text-xs text-muted">
                      {variant.name} · S/ {variant.price}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-background shadow-sm">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={content.headline} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-slate-300"><Icon name="image" size={40} /></span>
              )}
            </div>
          </div>
        </section>

        {content.benefits.length ? (
          <section className="w-full bg-background py-14">
            <div className="mx-auto max-w-6xl px-6">
              <h2 className="mb-8 text-center text-xs font-bold uppercase tracking-wider text-muted">Beneficios del producto</h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {content.benefits.map((benefit, index) => (
                  <div key={index} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Icon name="check" size={20} />
                    </span>
                    <p className="text-sm leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {content.faqs.length ? (
          <section className="mx-auto w-full max-w-4xl px-6 py-14">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {content.faqs.map((faq, index) => (
                <div key={index} className="rounded-xl border border-border bg-background p-5">
                  <p className="text-sm font-semibold">{faq.question}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="w-full bg-primary-soft py-14 text-center">
          <h2 className="text-2xl font-bold tracking-tight">¿Necesitas más información?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">Escríbenos para resolver tus consultas sobre este producto.</p>
          <div className="mt-6 flex justify-center">
            <LandingWhatsappButton tenantSlug={tenant.slug} landingSlug={landingSlug} enabled={whatsappEnabled} label="Consultar por WhatsApp" />
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-muted">
        © {tenant.name} · {isPreview ? "Vista previa privada" : "Página de producto"}
      </footer>
    </div>
  );
}
