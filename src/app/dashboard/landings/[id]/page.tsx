import { notFound } from "next/navigation";
import { LandingEditor } from "@/components/landings/landing-editor";
import { getProduct, NotFoundError as CatalogNotFoundError } from "@/lib/catalog/service";
import { getLanding, requireLandingActor } from "@/lib/landings/service";
import { getActiveTenantForUser } from "@/lib/tenants/service";
import { getStoreBySlug } from "@/lib/store/service";

export const dynamic = "force-dynamic";

export default async function EditLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireLandingActor();
  const { id } = await params;

  let landing;
  try {
    landing = await getLanding(actor, id);
  } catch {
    notFound();
  }

  let product;
  try {
    product = await getProduct(actor, landing.productId);
  } catch (error) {
    if (error instanceof CatalogNotFoundError) notFound();
    throw error;
  }

  const tenant = await getActiveTenantForUser(actor.userId);
  const store = tenant ? await getStoreBySlug(tenant.slug) : null;
  if (!store) notFound();

  return (
    <LandingEditor
      landing={landing}
      product={product}
      tenant={store}
      canPublish={actor.role === "OWNER"}
    />
  );
}
