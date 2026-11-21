import { getApiWhatsAppActor, providerCatalog } from "@/lib/whatsapp/service";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";

export async function GET(request: Request) {
  try {
    await getApiWhatsAppActor(request);
    return Response.json({ providers: providerCatalog() });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
