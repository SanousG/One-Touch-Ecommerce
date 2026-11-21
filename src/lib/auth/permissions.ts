import "server-only";
import { assertRole } from "./guards";

/** Permisos iniciales del módulo de catálogo (sin RBAC avanzado). */
export const CATALOG_MANAGE_ROLES = ["OWNER", "OPERATOR"] as const;
/** Archivar/restaurar y fluctuar categorías se reserva al propietario. */
export const CATALOG_OWNER_ROLES = ["OWNER"] as const;

export function assertCatalogManager(role: string) {
  return assertRole({ role }, CATALOG_MANAGE_ROLES);
}

export function assertCatalogOwner(role: string) {
  return assertRole({ role }, CATALOG_OWNER_ROLES);
}

/** Landings: OWNER publica; OWNER y OPERATOR crean/editan/guardan borradores. */
export function assertLandingManager(role: string) {
  return assertRole({ role }, CATALOG_MANAGE_ROLES);
}

export function assertLandingPublisher(role: string) {
  return assertRole({ role }, CATALOG_OWNER_ROLES);
}

/** Flujos de venta: mismo criterio que landings. OWNER publica. */
export function assertFlowManager(role: string) {
  return assertRole({ role }, CATALOG_MANAGE_ROLES);
}

export function assertFlowPublisher(role: string) {
  return assertRole({ role }, CATALOG_OWNER_ROLES);
}

/** Operaciones comerciales: OWNER y OPERATOR crean/listan; OWNER ajusta stock y verifica pagos. */
export function assertOrderManager(role: string) {
  return assertRole({ role }, CATALOG_MANAGE_ROLES);
}

export function assertInventoryAdjustment(role: string) {
  return assertRole({ role }, CATALOG_OWNER_ROLES);
}

export function assertPaymentVerification(role: string) {
  return assertRole({ role }, CATALOG_OWNER_ROLES);
}

export function assertFulfillmentManager(role: string) {
  return assertRole({ role }, CATALOG_MANAGE_ROLES);
}
