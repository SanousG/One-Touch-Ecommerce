import { landingErrorResponse } from "@/lib/landings/http";
import { buildLandingWhatsappUrl, getPublishedLanding } from "@/lib/landings/service";

type Context = { params: Promise<{ tenantSlug: string; landingSlug: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { tenantSlug, landingSlug } = await params;
    const landing = await getPublishedLanding(tenantSlug, landingSlug);
    if (!landing) return Response.json({ error: "Landing no disponible" }, { status: 404 });
    if (!landing.tenant.whatsappPhone) {
      return Response.json({ error: "La consulta por WhatsApp todavía no está disponible en esta tienda" }, { status: 409 });
    }
    return Response.json({ url: buildLandingWhatsappUrl(landing.tenant, landing.product) });
  } catch (error) {
    return landingErrorResponse(error);
  }
}
