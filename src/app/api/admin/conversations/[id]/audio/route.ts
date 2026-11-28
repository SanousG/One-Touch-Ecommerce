import { getApiInboxActor, sendAudioMessage } from "@/lib/whatsapp/conversations";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiInboxActor(request);
    const { id } = await params;
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Se requiere un archivo de audio" }, { status: 400 });
    }
    const message = await sendAudioMessage(actor, id, {
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/octet-stream",
      fileName: file.name || "audio",
    });
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
