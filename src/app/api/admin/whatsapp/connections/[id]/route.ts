import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { deleteConnection, getApiWhatsAppActor, updateConnection } from "@/lib/whatsapp/service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await getApiWhatsAppActor(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ connection: await updateConnection(actor, id, body ?? {}) });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const actor = await getApiWhatsAppActor(request);
    const { id } = await params;
    await deleteConnection(actor, id);
    return Response.json({ ok: true });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
