import { ForbiddenError, UnauthorizedError } from "../auth/guards";

export function landingErrorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return Response.json({ error: "Sin permisos para esta operación" }, { status: 403 });
  }
  if (error instanceof Error && error.name === "LandingNotFoundError") {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof Error && error.name === "LandingConflictError") {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof Error && error.name === "LandingValidationError") {
    return Response.json({ error: error.message }, { status: 400 });
  }
  console.error("Error no controlado en landings:", error);
  return Response.json({ error: "No se pudo completar la operación" }, { status: 500 });
}
