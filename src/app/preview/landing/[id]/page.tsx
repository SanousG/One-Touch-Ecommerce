import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingView } from "@/components/landings/landing-view";
import { getLandingPreview, requireLandingActor } from "@/lib/landings/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vista previa privada — One-Touch-Ecommerce",
  robots: { index: false, follow: false },
};

/** Se renderiza fuera del panel para que se vea igual que la página del cliente. */
export default async function PrivateLandingPreviewPage({ params }: { params: Promise<{ id: string }> }) {
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
      landingId={preview.landing.id}
    />
  );
}
