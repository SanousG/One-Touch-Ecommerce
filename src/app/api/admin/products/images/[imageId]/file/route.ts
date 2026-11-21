import { catalogErrorResponse } from "@/lib/catalog/http";
import { getAdminImage, getApiCatalogContext } from "@/lib/catalog/service";
import { readStoredImage } from "@/lib/storage/product-images";

export const runtime = "nodejs";

type Context = { params: Promise<{ imageId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getApiCatalogContext(request);
    const { imageId } = await params;
    const image = await getAdminImage(actor, imageId);
    const bytes = await readStoredImage(image.storageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
