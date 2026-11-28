import { getApiInboxActor, sendTemplateMessage } from "@/lib/whatsapp/conversations";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiInboxActor(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { templateId?: unknown } | null;
    if (typeof body?.templateId !== "string" || !body.templateId) {
      return Response.json({ error: "Se requiere una plantilla" }, { status: 400 });
    }
    return Response.json(await sendTemplateMessage(actor, id, body.templateId), { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
