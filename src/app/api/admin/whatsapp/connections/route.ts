import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { getApiWhatsAppActor, listConnections } from "@/lib/whatsapp/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiWhatsAppActor(request);
    return Response.json({ connections: await listConnections(actor) });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
