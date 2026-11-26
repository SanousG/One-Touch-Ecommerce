import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { createConnectionFromQr, getApiWhatsAppActor } from "@/lib/whatsapp/service";

export async function POST(request: Request) {
  try {
    const actor = await getApiWhatsAppActor(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json(await createConnectionFromQr(actor, body ?? {}), { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
