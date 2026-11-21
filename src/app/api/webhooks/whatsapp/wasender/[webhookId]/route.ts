import { getConnectionByWebhookId, getConnectionCredentials, getConnectionProvider } from "@/lib/whatsapp/connection-access";
import { ingestWebhook } from "@/lib/whatsapp/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ webhookId: string }> };

/** Endpoint público del proveedor. El tenant se resuelve desde el webhookId opaco. */
export async function POST(request: Request, { params }: Context) {
  const { webhookId } = await params;
  const connection = await getConnectionByWebhookId(webhookId);
  if (!connection) return Response.json({ error: "Webhook no encontrado" }, { status: 404 });

  const signature = request.headers.get("x-webhook-signature");
  const raw = await request.text();
  let payload: unknown;
  try { payload = raw ? JSON.parse(raw) : null; } catch {
    return Response.json({ error: "Payload inválido" }, { status: 400 });
  }

  const credentials = getConnectionCredentials(connection);
  const provider = getConnectionProvider(connection);
  if (!provider.verifyWebhook(signature, credentials.webhookSecret)) {
    return Response.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    const result = await ingestWebhook(connection, payload);
    return Response.json({ received: true, ...result });
  } catch (error) {
    console.error("[webhook] error al persistir/procesar:", error instanceof Error ? error.message.slice(0, 200) : "desconocido");
    // Responder 200 para no provocar reintentos ciegos; el evento queda en estado FAILED.
    return Response.json({ received: true, processed: false });
  }
}
