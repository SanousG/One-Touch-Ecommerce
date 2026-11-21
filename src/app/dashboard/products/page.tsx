import { ProductsView } from "@/components/catalog/products-view";
import { listCategories, listProducts, requireCatalogContext } from "@/lib/catalog/service";

export const dynamic = "force-dynamic";

type Search = { q?: string; categoryId?: string; visible?: string; status?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const actor = await requireCatalogContext();
  const filters = await searchParams;
  const [products, categories] = await Promise.all([
    listProducts(actor, filters),
    listCategories(actor),
  ]);

  return (
    <ProductsView
      products={products}
      categories={categories}
      filters={filters}
      canArchive={actor.role === "OWNER"}
    />
  );
}
