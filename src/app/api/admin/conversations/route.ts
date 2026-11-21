import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { getApiInboxActor, listConversations } from "@/lib/whatsapp/conversations";

export async function GET(request: Request) {
  try {
    const actor = await getApiInboxActor(request);
    const url = new URL(request.url);
    const conversations = await listConversations(
      actor,
      url.searchParams.get("status") ?? undefined,
      url.searchParams.get("q") ?? undefined,
    );
    return Response.json({ conversations });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
