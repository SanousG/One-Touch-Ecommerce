import { getApiInboxActor, sendImageMessage } from "@/lib/whatsapp/conversations";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiInboxActor(request);
    const { id } = await params;
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const caption = form?.get("caption");
    if (!(file instanceof File)) {
      return Response.json({ error: "Se requiere un archivo de imagen" }, { status: 400 });
    }
    const message = await sendImageMessage(actor, id, {
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/octet-stream",
      fileName: file.name || "image",
      caption: typeof caption === "string" ? caption : "",
    });
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
