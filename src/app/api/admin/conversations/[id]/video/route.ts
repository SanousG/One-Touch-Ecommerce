import { getApiInboxActor, sendVideoMessage } from "@/lib/whatsapp/conversations";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiInboxActor(request);
    const { id } = await params;
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const caption = form?.get("caption");
    if (!(file instanceof File)) {
      return Response.json({ error: "Se requiere un archivo de video MP4" }, { status: 400 });
    }
    const message = await sendVideoMessage(actor, id, {
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/octet-stream",
      fileName: file.name || "video",
      caption: typeof caption === "string" ? caption : "",
    });
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
