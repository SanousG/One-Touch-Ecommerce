import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingView } from "@/components/landings/landing-view";
import { getLandingPreview, requireLandingActor } from "@/lib/landings/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vista previa privada — One-Touch-Ecommerce",
  robots: { index: false, follow: false },
};

export default async function LandingPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireLandingActor();
  const { id } = await params;
  let preview;
  try {
    preview = await getLandingPreview(actor, id);
  } catch {
    notFound();
  }

  return (
    <LandingView
      tenant={preview.tenant}
      product={preview.product}
      content={preview.content}
      mode="preview"
      landingSlug={preview.landing.slug}
    />
  );
}
