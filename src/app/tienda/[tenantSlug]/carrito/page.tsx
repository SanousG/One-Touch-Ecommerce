import { notFound } from "next/navigation";
import { CartView } from "@/components/store/cart-view";
import { getStoreBySlug } from "@/lib/store/service";

export const dynamic = "force-dynamic";

export default async function StoreCartPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const store = await getStoreBySlug(tenantSlug);
  if (!store) notFound();

  return (
    <CartView
      tenantId={store.id}
      tenantSlug={store.slug}
      whatsappConfigured={Boolean(store.whatsappPhone)}
    />
  );
}
