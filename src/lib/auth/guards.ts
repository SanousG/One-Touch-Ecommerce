import "server-only";

export type SessionLike = { user: { id: string } } | null | undefined;

export class UnauthorizedError extends Error {
  constructor(message = "Debe iniciar sesión para continuar") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "No tiene permiso para realizar esta operación") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Verificación de sesión pura, reutilizable por páginas, acciones y handlers. */
export function assertAuthenticated<T extends { user: { id: string } }>(
  session: T | null | undefined,
): T["user"] {
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user;
}

/** La membresía debe pertenecer exactamente al usuario y al negocio solicitados. */
export function assertTenantMembership<T extends { tenantId: string; userId: string }>(
  membership: T | null | undefined,
  tenantId: string,
  userId: string,
): T {
  if (!membership || membership.tenantId !== tenantId || membership.userId !== userId) {
    throw new ForbiddenError("El negocio solicitado no pertenece al usuario");
  }
  return membership;
}

/** Comprobación de rol. OWNER es el único rol con permisos de administración en Fase 1. */
export function assertRole<T extends { role: string }>(
  membership: T,
  allowedRoles: readonly string[],
): T {
  if (!allowedRoles.includes(membership.role)) {
    throw new ForbiddenError("Rol insuficiente para esta operación");
  }
  return membership;
}
