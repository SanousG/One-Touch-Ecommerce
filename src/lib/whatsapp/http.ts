import { ForbiddenError, UnauthorizedError } from "../auth/guards";
import { InboxError } from "./conversations";
import { WhatsAppError } from "./service";

export function whatsappErrorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (error instanceof ForbiddenError) return Response.json({ error: "Sin permisos para esta operación" }, { status: 403 });
  if (error instanceof WhatsAppError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof InboxError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "InboxError") return Response.json({ error: error.message }, { status: 400 });
  const status = error && typeof error === "object" && "status" in error ? Number((error as { status: unknown }).status) : 0;
  if (error instanceof Error && Number.isInteger(status) && status >= 400 && status <= 599) {
    return Response.json({ error: error.message.slice(0, 200) }, { status });
  }
  console.error("Error no controlado en WhatsApp:", error instanceof Error ? error.message.slice(0, 200) : "desconocido");
  return Response.json({ error: "No se pudo completar la operación" }, { status: 500 });
}
