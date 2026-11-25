import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { listFailedWebhooks, requireInboxActor, retryFailedWebhooks } from "@/lib/whatsapp/conversations";

export async function GET() {
  try {
    const actor = await requireInboxActor();
    return Response.json({ events: await listFailedWebhooks(actor) });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireInboxActor();
    const body = (await request.json().catch(() => null)) as { limit?: unknown } | null;
    const limit = typeof body?.limit === "number" ? body.limit : 20;
    return Response.json(await retryFailedWebhooks(actor, limit));
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
