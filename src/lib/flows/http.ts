import { ForbiddenError, UnauthorizedError } from "../auth/guards";
import { FlowConflictError, FlowInputError, FlowNotFoundError, FlowValidationError } from "./service";

export function flowErrorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return Response.json({ error: "Sin permisos para esta operación" }, { status: 403 });
  }
  if (error instanceof FlowNotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof FlowConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof FlowValidationError) {
    return Response.json({ error: error.message, issues: error.issues }, { status: 422 });
  }
  if (error instanceof FlowInputError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  console.error("Error no controlado en flujos:", error);
  return Response.json({ error: "No se pudo completar la operación" }, { status: 500 });
}
