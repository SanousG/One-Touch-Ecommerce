import "server-only";
import { requireUser } from "../auth/session";
import { getActiveTenantForUser } from "./service";

/** Punto de entrada obligatorio para cualquier página privada futura. */
export async function requireDashboardContext() {
  const user = await requireUser();
  const activeTenant = await getActiveTenantForUser(user.id);
  return { user, activeTenant };
}
