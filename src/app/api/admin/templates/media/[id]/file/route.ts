import { flowErrorResponse } from "@/lib/flows/http";
import { getApiFlowActor, getTemplateMedia } from "@/lib/flows/service";
import { fileResponse } from "@/lib/storage/http-file-response";
import { readStoredImage } from "@/lib/storage/product-images";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getApiFlowActor(request);
    const { id } = await params;
    const media = await getTemplateMedia(actor, id);
    const bytes = await readStoredImage(media.storageKey);
    return fileResponse(request, bytes, media.mimeType);
  } catch (error) {
    return flowErrorResponse(error);
  }
}
