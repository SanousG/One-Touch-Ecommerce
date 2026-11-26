import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { getApiWhatsAppActor, refreshQrConnection } from "@/lib/whatsapp/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getApiWhatsAppActor(request);
    const { id } = await params;
    return Response.json(await refreshQrConnection(actor, id));
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
