import { catalogErrorResponse } from "@/lib/catalog/http";
import { createVariant, getApiCatalogContext } from "@/lib/catalog/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiCatalogContext(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const product = await createVariant(actor, id, body ?? {});
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
