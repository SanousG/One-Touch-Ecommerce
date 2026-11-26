import { landingErrorResponse } from "@/lib/landings/http";
import {
  buildLandingWhatsappUrl,
  getApiLandingActor,
  getLandingPreview,
} from "@/lib/landings/service";

type Context = { params: Promise<{ id: string }> };

/** Genera el enlace de WhatsApp desde el borrador, para la vista previa privada. */
export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiLandingActor(request);
    const { id } = await params;
    const preview = await getLandingPreview(actor, id);
    if (!preview.tenant.whatsappPhone) {
      return Response.json({ error: "La consulta por WhatsApp todavía no está disponible en esta tienda" }, { status: 409 });
    }
    return Response.json({ url: buildLandingWhatsappUrl(preview.tenant, preview.product) });
  } catch (error) {
    return landingErrorResponse(error);
  }
}
