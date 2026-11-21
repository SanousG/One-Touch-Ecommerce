import { catalogErrorResponse } from "@/lib/catalog/http";
import { getApiCatalogContext, getProduct, updateProduct } from "@/lib/catalog/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getApiCatalogContext(request);
    const { id } = await params;
    return Response.json({ product: await getProduct(actor, id) });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await getApiCatalogContext(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ product: await updateProduct(actor, id, body ?? {}) });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
