import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";
import { assertAuthenticated } from "./guards";

/** Sesión real validada en base de datos. Se memoiza durante el render. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Debe llamarse en cada página/acción privada (no solo en el layout). */
export async function requireUser() {
  const session = await getSession();
  return assertAuthenticated(session);
}
