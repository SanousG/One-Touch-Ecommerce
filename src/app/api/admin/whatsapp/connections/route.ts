import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { createConnection, getApiWhatsAppActor, listConnections } from "@/lib/whatsapp/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiWhatsAppActor(request);
    return Response.json({ connections: await listConnections(actor) });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getApiWhatsAppActor(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ connection: await createConnection(actor, body ?? {}) }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
