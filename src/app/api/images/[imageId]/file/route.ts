import { catalogErrorResponse } from "@/lib/catalog/http";
import { getPublicImage } from "@/lib/catalog/service";
import { fileResponse } from "@/lib/storage/http-file-response";
import { readStoredImage } from "@/lib/storage/product-images";

export const runtime = "nodejs";

type Context = { params: Promise<{ imageId: string }> };

/** Superficie pública preparada para la tienda de la Fase 2B. */
export async function GET(request: Request, { params }: Context) {
  try {
    const { imageId } = await params;
    const image = await getPublicImage(imageId);
    const bytes = await readStoredImage(image.storageKey);
    return fileResponse(request, bytes, image.mimeType);
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
