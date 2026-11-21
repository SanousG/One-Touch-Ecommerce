import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/store/product-detail";
import { getStoreBySlug, getStoreProduct } from "@/lib/store/service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ tenantSlug: string; productSlug: string }> };

export default async function StoreProductPage({ params }: Props) {
  const { tenantSlug, productSlug } = await params;
  const store = await getStoreBySlug(tenantSlug);
  if (!store) notFound();
  const product = await getStoreProduct(store.id, productSlug);
  if (!product) notFound();

  return (
    <ProductDetail
      product={product}
      tenantId={store.id}
      tenantSlug={store.slug}
      whatsappConfigured={Boolean(store.whatsappPhone)}
    />
  );
}
