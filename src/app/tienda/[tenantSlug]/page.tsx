import { notFound } from "next/navigation";
import { StoreCatalog } from "@/components/store/store-catalog";
import { getStoreBySlug, listStoreCategories, listStoreProducts } from "@/lib/store/service";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ q?: string; categoryId?: string }>;
};

export default async function StorePage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const store = await getStoreBySlug(tenantSlug);
  if (!store) notFound();

  const filters = await searchParams;
  const [products, categories] = await Promise.all([
    listStoreProducts(store.id, filters),
    listStoreCategories(store.id),
  ]);

  return <StoreCatalog store={store} products={products} categories={categories} filters={filters} />;
}
