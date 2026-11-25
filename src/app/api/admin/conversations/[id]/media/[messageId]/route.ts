import { getPrisma } from "@/lib/db/prisma";
import { getApiInboxActor } from "@/lib/whatsapp/conversations";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import { readWhatsappImage } from "@/lib/whatsapp/media-storage";

type Context = { params: Promise<{ id: string; messageId: string }> };

/** Sirve una foto de la bandeja solo al usuario autenticado del tenant dueño. */
export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getApiInboxActor(request);
    const { id, messageId } = await params;
    const message = await getPrisma().conversationMessage.findFirst({
      where: { id: messageId, conversationId: id, tenantId: actor.tenantId },
      select: { media: true },
    });
    if (!message) return Response.json({ error: "Imagen no encontrada" }, { status: 404 });
    const media = message.media as { status?: string; path?: string } | null;
    if (media?.status !== "ready" || !media.path) {
      return Response.json({ error: "La imagen no está disponible" }, { status: 404 });
    }
    const file = await readWhatsappImage(media.path);
    if (!file) return Response.json({ error: "La imagen no está disponible" }, { status: 404 });
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
