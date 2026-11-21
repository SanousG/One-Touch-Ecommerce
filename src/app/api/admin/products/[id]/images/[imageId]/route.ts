import { catalogErrorResponse } from "@/lib/catalog/http";
import {
  getApiCatalogContext,
  removeProductImage,
  reorderImages,
  setCoverImage,
} from "@/lib/catalog/service";

type Context = { params: Promise<{ id: string; imageId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await getApiCatalogContext(request);
    const { id, imageId } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (body?.isCover === true) {
      return Response.json({ product: await setCoverImage(actor, id, imageId) });
    }
    if (Array.isArray(body?.orderedIds)) {
      return Response.json({
        product: await reorderImages(actor, id, body.orderedIds.filter((item): item is string => typeof item === "string")),
      });
    }
    return Response.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const actor = await getApiCatalogContext(request);
    const { id, imageId } = await params;
    return Response.json({ product: await removeProductImage(actor, id, imageId) });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
