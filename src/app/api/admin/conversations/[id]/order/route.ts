import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { getApiInboxActor, getConversation } from "@/lib/whatsapp/conversations";
import { createOrder } from "@/lib/commerce/service";
import type { CreateOrderInput } from "@/lib/commerce/types";

type Context = { params: Promise<{ id: string }> };

/** Reutiliza el servicio de pedidos de la Fase 4A; solo añade el vínculo con la conversación. */
export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiInboxActor(request);
    const { id } = await params;
    await getConversation(actor, id);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const key = request.headers.get("idempotency-key") ?? undefined;
    const order = await createOrder(actor, (body ?? {}) as CreateOrderInput, key, { conversationId: id });
    return Response.json({ order }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
