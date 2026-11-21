import { auth } from "@/lib/auth/auth";
import { assertAuthenticated, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";
import { createTenantForUser, ValidationError } from "@/lib/tenants/service";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const user = assertAuthenticated(session);

    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name : "";
    const tenant = await createTenantForUser(user.id, { name });

    return Response.json({ tenant }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ForbiddenError) {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }
    return Response.json({ error: "No se pudo crear el negocio" }, { status: 500 });
  }
}
