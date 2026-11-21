import { catalogErrorResponse } from "@/lib/catalog/http";
import { createProduct, getApiCatalogContext, listProducts } from "@/lib/catalog/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiCatalogContext(request);
    const url = new URL(request.url);
    const products = await listProducts(actor, {
      q: url.searchParams.get("q") ?? undefined,
      categoryId: url.searchParams.get("categoryId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      visible: url.searchParams.get("visible") ?? undefined,
    });
    return Response.json({ products });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getApiCatalogContext(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const product = await createProduct(actor, body ?? {});
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
