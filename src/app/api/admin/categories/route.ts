import { catalogErrorResponse } from "@/lib/catalog/http";
import { createCategory, getApiCatalogContext, listCategories } from "@/lib/catalog/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiCatalogContext(request);
    return Response.json({ categories: await listCategories(actor) });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getApiCatalogContext(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const category = await createCategory(actor, body ?? {});
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
