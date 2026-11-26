import { getAuth } from "@/lib/auth/auth";
import { assertAuthenticated, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";
import { updateTenantName, ValidationError } from "@/lib/tenants/service";

export async function PATCH(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    const user = assertAuthenticated(session);
    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const tenant = await updateTenantName(user.id, body ?? {});
    return Response.json({ tenant });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return Response.json({ error: "Solo el propietario puede modificar los datos del negocio" }, { status: 403 });
    }
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "No se pudo guardar la configuración" }, { status: 500 });
  }
}
