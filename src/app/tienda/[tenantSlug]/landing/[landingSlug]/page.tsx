import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingView } from "@/components/landings/landing-view";
import { getPublishedLanding } from "@/lib/landings/service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tenantSlug: string; landingSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug, landingSlug } = await params;
  const landing = await getPublishedLanding(tenantSlug, landingSlug);
  if (!landing) return { title: "Página no disponible", robots: { index: false } };
  return {
    title: `${landing.content.headline} | ${landing.tenant.name}`,
    description: landing.content.summary.slice(0, 160),
  };
}

export default async function PublicLandingPage({ params }: Props) {
  const { tenantSlug, landingSlug } = await params;
  const landing = await getPublishedLanding(tenantSlug, landingSlug);
  if (!landing) notFound();

  return (
    <LandingView
      tenant={landing.tenant}
      product={landing.product}
      content={landing.content}
      mode="public"
      landingSlug={landing.slug}
    />
  );
}
