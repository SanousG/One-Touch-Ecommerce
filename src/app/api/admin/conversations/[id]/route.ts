import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { getApiInboxActor, getConversation } from "@/lib/whatsapp/conversations";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getApiInboxActor(request);
    const { id } = await params;
    return Response.json({ conversation: await getConversation(actor, id) });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
