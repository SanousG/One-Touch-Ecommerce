import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/catalog/product-editor";
import { getProduct, listCategories, NotFoundError, requireCatalogContext } from "@/lib/catalog/service";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireCatalogContext();
  const { id } = await params;
  let product;
  try {
    product = await getProduct(actor, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const categories = await listCategories(actor);

  return (
    <ProductEditor product={product} categories={categories} canArchive={actor.role === "OWNER"} />
  );
}
