import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { getApiWhatsAppActor, regenerateQrConnection } from "@/lib/whatsapp/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiWhatsAppActor(request);
    const { id } = await params;
    return Response.json(await regenerateQrConnection(actor, id));
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
