import { ForbiddenError, UnauthorizedError } from "../auth/guards";
import { VoucherValidationError } from "../storage/vouchers";
import { CommerceConflictError, CommerceError, CommerceNotFoundError } from "./service";

export function commerceErrorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError) return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  if (error instanceof ForbiddenError) return Response.json({ error: "Sin permisos para esta operación" }, { status: 403 });
  if (error instanceof CommerceNotFoundError) return Response.json({ error: error.message }, { status: 404 });
  if (error instanceof CommerceConflictError) return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof CommerceError || error instanceof VoucherValidationError) {
    return Response.json({ error: error.message }, { status: error instanceof CommerceError ? error.status : 400 });
  }
  console.error("Error no controlado en comercio:", error);
  return Response.json({ error: "No se pudo completar la operación" }, { status: 500 });
}
