import { auth } from "@/lib/auth/auth";
import { assertAuthenticated, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";
import { switchTenantForUser } from "@/lib/tenants/service";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const user = assertAuthenticated(session);

    const body = (await request.json().catch(() => null)) as { tenantId?: unknown } | null;
    const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "";
    if (!tenantId) {
      return Response.json({ error: "Negocio no válido" }, { status: 400 });
    }

    const tenant = await switchTenantForUser(user.id, tenantId);
    return Response.json({ tenant });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return Response.json({ error: "No pertenece a ese negocio" }, { status: 403 });
    }
    return Response.json({ error: "No se pudo cambiar de negocio" }, { status: 500 });
  }
}
