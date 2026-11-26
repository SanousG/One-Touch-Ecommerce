import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { LandingWhatsappButton } from "./landing-whatsapp-button";
import { LandingEffect } from "./landing-effect";
import { DEFAULT_LANDING_DESIGN } from "@/lib/landings/design";
import type { LandingContentDTO } from "@/lib/landings/service";
import type { StoreProductDTO, StoreTenantDTO } from "@/lib/store/service";

type Props = {
  tenant: StoreTenantDTO;
  product: StoreProductDTO;
  content: LandingContentDTO;
  mode: "public" | "preview";
  landingSlug: string;
  landingId?: string;
};

function withAlpha(hex: string, alpha: number): string {
  let value = hex.replace("#", "");
  if (value.length === 3) value = value.split("").map((c) => c + c).join("");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function LandingView({ tenant, product, content, mode, landingSlug, landingId }: Props) {
  const isPreview = mode === "preview";
  const d = { ...DEFAULT_LANDING_DESIGN, ...(content.design ?? {}) };
  const imageUrl = content.heroImageId
    ? isPreview
      ? `/api/admin/products/images/${content.heroImageId}/file`
      : `/api/images/${content.heroImageId}/file`
    : product.coverUrl;
  const storeUrl = `/tienda/${tenant.slug}`;
  const whatsappEnabled = Boolean(tenant.whatsappPhone);
  const whatsappEndpoint = isPreview && landingId ? `/api/admin/landings/${landingId}/whatsapp` : undefined;

  const headlineSize = {
    sm: "text-2xl lg:text-3xl",
    md: "text-3xl lg:text-4xl",
    lg: "text-3xl lg:text-5xl",
    xl: "text-4xl lg:text-6xl",
  }[d.headlineSize];
  const sectionPadding = { compact: "py-8 lg:py-10", normal: "py-12 lg:py-16", wide: "py-16 lg:py-24" }[d.spacing];
  const centered = d.layout === "centered";
  const split = d.layout === "split-left" || d.layout === "split-right";
  const imageFirst = d.layout === "split-right" || d.layout === "stacked";
  const buttonStyle: React.CSSProperties = d.buttonStyle === "solid"
    ? { backgroundColor: d.buttonColor, color: d.buttonTextColor, borderColor: d.buttonColor }
    : { backgroundColor: "transparent", color: d.buttonColor, borderColor: d.buttonColor, borderWidth: 2, borderStyle: "solid" };

  const eyebrow = d.eyebrow.trim() || product.name;
  const whatsappCta = (
    <LandingWhatsappButton
      tenantSlug={tenant.slug}
      landingSlug={landingSlug}
      enabled={whatsappEnabled}
      label={d.buttonText}
      style={buttonStyle}
      align={centered ? "center" : "start"}
      endpoint={whatsappEndpoint}
    />
  );
  const footerCta = (
    <LandingWhatsappButton
      tenantSlug={tenant.slug}
      landingSlug={landingSlug}
      enabled={whatsappEnabled}
      label={d.buttonText}
      style={buttonStyle}
      align="center"
      endpoint={whatsappEndpoint}
    />
  );

  const textBlock = (
    <div className={`flex flex-col gap-5 ${centered ? "items-center text-center" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: d.primaryColor }}>{eyebrow}</p>
      <h1 className={`${headlineSize} font-bold leading-tight tracking-tight`}>{content.headline}</h1>
      {d.showSummary ? <p className={`max-w-lg text-base leading-relaxed opacity-80 lg:text-lg`}>{content.summary}</p> : null}
      {d.showPrice ? (
        <div className={`flex flex-wrap items-baseline gap-3 ${centered ? "justify-center" : ""}`}>
          <span className="text-sm uppercase tracking-wider opacity-70">{d.priceLabel}</span>
          <span className="text-3xl font-bold lg:text-4xl" style={{ color: d.primaryColor }}>
            {d.priceText.trim() || product.priceLabel}
          </span>
          {d.oldPriceText.trim() ? (
            <span className="text-base line-through opacity-60">{d.oldPriceText}</span>
          ) : null}
          {d.discountText.trim() ? (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ backgroundColor: withAlpha(d.primaryColor, 0.14), color: d.primaryColor }}
            >
              {d.discountText}
            </span>
          ) : null}
        </div>
      ) : null}
      {whatsappCta}
      {d.showVariants && product.variants.length > 0 ? (
        <div className={`flex flex-wrap gap-2 pt-2 ${centered ? "justify-center" : ""}`}>
          {product.variants.map((variant) => (
            <span key={variant.id} className="rounded-md px-2.5 py-1 text-xs" style={{ backgroundColor: withAlpha(d.primaryColor, 0.08) }}>
              {variant.name} · S/ {variant.price}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  const imageBlock = d.imageFit === "contain" ? (
    <div className="flex w-full justify-center">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={content.headline}
          className="h-auto w-auto max-w-full shadow-sm"
          style={{
            maxHeight: `${d.imageHeight}px`,
            borderRadius: `${d.imageRadius}px`,
          }}
        />
      ) : (
        <span
          className="flex w-full items-center justify-center bg-background text-slate-300"
          style={{ height: `${d.imageHeight}px`, borderRadius: `${d.imageRadius}px` }}
        >
          <Icon name="image" size={40} />
        </span>
      )}
    </div>
  ) : (
    <div
      className="w-full overflow-hidden bg-background shadow-sm"
      style={{ height: `${d.imageHeight}px`, borderRadius: `${d.imageRadius}px` }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={content.headline}
          className="h-full w-full object-cover"
          style={{
            objectPosition: `${d.imagePositionX}% ${d.imagePositionY}%`,
            transform: `scale(${d.imageZoom / 100})`,
            transformOrigin: `${d.imagePositionX}% ${d.imagePositionY}%`,
          }}
        />
      ) : (
        <span className="flex h-full items-center justify-center text-slate-300"><Icon name="image" size={40} /></span>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: d.backgroundColor, color: d.textColor }}>
      <LandingEffect design={d} />
      {isPreview ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          Vista previa privada del borrador · no visible para clientes
        </div>
      ) : null}

      <header className="sticky top-0 z-40 w-full border-b border-border backdrop-blur-md" style={{ backgroundColor: withAlpha(d.backgroundColor, 0.95) }}>
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <span className="text-base font-bold tracking-tight">{tenant.name}</span>
          {isPreview ? (
            <span className="cursor-not-allowed text-sm opacity-70">Ver tienda</span>
          ) : (
            <Link href={storeUrl} className="text-sm opacity-70 hover:opacity-100">Ver tienda</Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        <div className="border-b border-border" style={{ backgroundColor: withAlpha(d.primaryColor, 0.05) }}>
          <div className={`mx-auto flex max-w-6xl items-center justify-between px-6 py-2 text-xs ${centered ? "flex-col gap-2" : ""}`}>
            {d.showBadge ? (
              <span className="rounded-full px-2.5 py-0.5 font-semibold uppercase tracking-wider" style={{ backgroundColor: withAlpha(d.primaryColor, 0.14), color: d.primaryColor }}>
                {d.badgeText}
              </span>
            ) : <span />}
            {d.showReference ? (
              <span className="font-mono uppercase tracking-wider opacity-70">Ref. {product.variants[0]?.sku ?? product.slug}</span>
            ) : null}
          </div>
        </div>

        <section className={`mx-auto w-full max-w-6xl px-6 ${sectionPadding}`}>
          {split ? (
            <div className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ${centered ? "text-center" : ""}`}>
              {imageFirst ? <>{imageBlock}{textBlock}</> : <>{textBlock}{imageBlock}</>}
            </div>
          ) : (
            <div className={`flex flex-col gap-10 ${centered ? "items-center text-center" : ""}`}>
              {imageFirst ? <>{imageBlock}{textBlock}</> : <>{textBlock}{imageBlock}</>}
            </div>
          )}
        </section>

        {d.showBenefits && content.benefits.length ? (
          <section className="w-full py-14" style={{ backgroundColor: withAlpha(d.primaryColor, 0.06) }}>
            <div className="mx-auto max-w-6xl px-6">
              <h2 className="mb-8 text-center text-xs font-bold uppercase tracking-wider opacity-70">Beneficios del producto</h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {content.benefits.map((benefit, index) => (
                  <div key={index} className="rounded-xl border border-border bg-surface p-6 shadow-sm" style={{ color: d.textColor }}>
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: withAlpha(d.primaryColor, 0.12), color: d.primaryColor }}>
                      <Icon name="check" size={20} />
                    </span>
                    <p className="text-sm leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {d.showFaqs && content.faqs.length ? (
          <section className="mx-auto w-full max-w-4xl px-6 py-14">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {content.faqs.map((faq, index) => (
                <div key={index} className="rounded-xl border border-border p-5" style={{ backgroundColor: withAlpha(d.primaryColor, 0.04) }}>
                  <p className="text-sm font-semibold">{faq.question}</p>
                  <p className="mt-2 text-sm leading-relaxed opacity-80">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {d.showFooter ? (
          <section className="w-full py-14 text-center" style={{ backgroundColor: withAlpha(d.primaryColor, 0.1) }}>
            <h2 className="text-2xl font-bold tracking-tight">¿Necesitas más información?</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm opacity-80">{d.footerText}</p>
            <div className="mt-6 flex justify-center">
              {footerCta}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs opacity-70">
        © {tenant.name} · {isPreview ? "Vista previa privada" : "Página de producto"}
      </footer>
    </div>
  );
}
