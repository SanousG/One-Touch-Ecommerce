import { catalogErrorResponse } from "@/lib/catalog/http";
import { getApiCatalogContext, updateVariant } from "@/lib/catalog/service";

type Context = { params: Promise<{ id: string; variantId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await getApiCatalogContext(request);
    const { id, variantId } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ product: await updateVariant(actor, id, variantId, body ?? {}) });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
