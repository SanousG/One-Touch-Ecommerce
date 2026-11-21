import { getAuth } from "@/lib/auth/auth";
import { assertAuthenticated, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";
import { updateTenantWhatsapp, ValidationError } from "@/lib/tenants/service";

export async function PATCH(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    const user = assertAuthenticated(session);
    const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
    const tenant = await updateTenantWhatsapp(user.id, body ?? {});
    return Response.json({ tenant });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "Debe iniciar sesión" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return Response.json({ error: "Solo el propietario puede configurar WhatsApp" }, { status: 403 });
    }
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "No se pudo guardar la configuración" }, { status: 500 });
  }
}
