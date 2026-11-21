import { catalogErrorResponse } from "@/lib/catalog/http";
import { getPublicImage } from "@/lib/catalog/service";
import { readStoredImage } from "@/lib/storage/product-images";

export const runtime = "nodejs";

type Context = { params: Promise<{ imageId: string }> };

/** Superficie pública preparada para la tienda de la Fase 2B. */
export async function GET(_request: Request, { params }: Context) {
  try {
    const { imageId } = await params;
    const image = await getPublicImage(imageId);
    const bytes = await readStoredImage(image.storageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
