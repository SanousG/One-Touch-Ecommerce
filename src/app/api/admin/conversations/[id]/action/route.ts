import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import {
  assignConversation,
  getApiInboxActor,
  resolveConversation,
  takeConversation,
} from "@/lib/whatsapp/conversations";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiInboxActor(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = String(body?.action ?? "");
    if (action === "TAKE") return Response.json({ conversation: await takeConversation(actor, id) });
    if (action === "RESOLVE") return Response.json({ conversation: await resolveConversation(actor, id) });
    if (action === "REOPEN") return Response.json({ conversation: await resolveConversation(actor, id, true) });
    if (action === "ASSIGN") {
      const userId = typeof body?.userId === "string" ? body.userId : "";
      if (!userId) return Response.json({ error: "Usuario no válido" }, { status: 400 });
      return Response.json({ conversation: await assignConversation(actor, id, userId) });
    }
    return Response.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
