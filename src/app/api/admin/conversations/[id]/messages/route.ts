import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { getApiInboxActor, sendMessage } from "@/lib/whatsapp/conversations";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiInboxActor(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const text = typeof body?.text === "string" ? body.text : "";
    return Response.json({ message: await sendMessage(actor, id, text) }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
