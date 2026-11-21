import { ForbiddenError, UnauthorizedError } from "../auth/guards";
import { ImageValidationError } from "../storage/product-images";
import { NotFoundError, ValidationError } from "./service";

export function catalogErrorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return Response.json({ error: "Sin permisos para esta operación" }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ValidationError || error instanceof ImageValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  console.error("Error no controlado en catálogo:", error);
  return Response.json({ error: "No se pudo completar la operación" }, { status: 500 });
}
