import "server-only";
import { cache } from "react";
import { getPrisma } from "../db/prisma";
import { assertRole, assertTenantMembership, ForbiddenError } from "../auth/guards";

export const OWNER_ROLE = "OWNER" as const;
export const OPERATOR_ROLE = "OPERATOR" as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  role: typeof OWNER_ROLE | typeof OPERATOR_ROLE;
  isActive: boolean;
};

function toSummary(
  membership: { role: TenantSummary["role"]; tenant: { id: string; name: string; slug: string } },
  activeTenantId: string | null,
): TenantSummary {
  return {
    id: membership.tenant.id,
    name: membership.tenant.name,
    slug: membership.tenant.slug,
    role: membership.role,
    isActive: membership.tenant.id === activeTenantId,
  };
}

function validateName(input: string): string {
  const name = input.trim();
  if (name.length < 2 || name.length > 60) {
    throw new ValidationError("El nombre del negocio debe tener entre 2 y 60 caracteres");
  }
  return name;
}

function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "negocio"}-${Math.random().toString(36).slice(2, 8)}`;
}

async function findMembership(userId: string, tenantId: string) {
  return getPrisma().tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: { tenant: true },
  });
}

/** Rol del usuario en un negocio concreto. Devuelve null si no pertenece. */
export const getMembershipRole = cache(async function getMembershipRole(
  userId: string,
  tenantId: string,
): Promise<TenantSummary["role"] | null> {
  const membership = await getPrisma().tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
});

/** Lista únicamente los negocios a los que pertenece el usuario. */
export const listUserTenants = cache(async function listUserTenants(userId: string): Promise<TenantSummary[]> {
  const [memberships, user] = await Promise.all([
    getPrisma().tenantMembership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { tenant: { name: "asc" } },
    }),
    getPrisma().user.findUnique({ where: { id: userId }, select: { activeTenantId: true } }),
  ]);

  return memberships.map((m) => toSummary(m, user?.activeTenantId ?? null));
});

/** Consulta segura de un negocio: la membresía se exige en la propia consulta. */
export async function getTenantForUser(userId: string, tenantId: string): Promise<TenantSummary> {
  const membership = assertTenantMembership(
    await findMembership(userId, tenantId),
    tenantId,
    userId,
  );
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { activeTenantId: true },
  });
  return toSummary(membership, user?.activeTenantId ?? null);
}

/**
 * Resuelve el negocio activo. Si el valor persistido es inválido o está vacío,
 * usa de forma efectiva (sin escribir) la primera membresía del usuario.
 * Nunca devuelve un negocio al que el usuario no pertenezca.
 */
export const getActiveTenantForUser = cache(async function getActiveTenantForUser(userId: string): Promise<TenantSummary | null> {
  const [user, memberships] = await Promise.all([
    getPrisma().user.findUnique({ where: { id: userId }, select: { activeTenantId: true } }),
    getPrisma().tenantMembership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (memberships.length === 0) return null;

  const persistedId = user?.activeTenantId ?? null;
  const effectiveId =
    memberships.find((m) => m.tenantId === persistedId)?.tenantId ?? memberships[0].tenantId;
  return toSummary(memberships.find((m) => m.tenantId === effectiveId)!, effectiveId);
});

/** Crea el negocio, asigna OWNER al creador y lo deja como activo en una transacción. */
export async function createTenantForUser(userId: string, input: { name: string }): Promise<TenantSummary> {
  const name = validateName(input.name);

  return getPrisma().$transaction(async (tx) => {
    let slug = slugify(name);
    while (await tx.tenant.findUnique({ where: { slug } })) {
      slug = slugify(name);
    }

    const tenant = await tx.tenant.create({ data: { name, slug } });
    await tx.tenantMembership.create({
      data: { tenantId: tenant.id, userId, role: OWNER_ROLE },
    });
    await tx.user.update({ where: { id: userId }, data: { activeTenantId: tenant.id } });

    return { id: tenant.id, name: tenant.name, slug: tenant.slug, role: OWNER_ROLE, isActive: true };
  });
}

/** Cambia el negocio activo solo después de verificar la membresía. */
export async function switchTenantForUser(userId: string, tenantId: string): Promise<TenantSummary> {
  return getPrisma().$transaction(async (tx) => {
    const membership = await tx.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: { tenant: true },
    });
    const verified = assertTenantMembership(membership, tenantId, userId);

    await tx.user.update({ where: { id: userId }, data: { activeTenantId: tenantId } });
    return toSummary(verified, tenantId);
  });
}

/** Configuración pública del negocio activo (lectura verificada). */
export const getActiveTenantSettings = cache(async function getActiveTenantSettings(userId: string) {
  const active = await getActiveTenantForUser(userId);
  if (!active) throw new ForbiddenError("Seleccione un negocio");
  const tenant = await getPrisma().tenant.findFirst({
    where: { id: active.id },
    select: { id: true, name: true, slug: true, whatsappPhone: true },
  });
  if (!tenant) throw new ForbiddenError("Negocio no encontrado");
  return { ...tenant, role: active.role };
});

/** Normaliza y valida un número E.164. Devuelve null si se solicita vaciar. */
export function normalizeWhatsappPhone(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new ValidationError("Teléfono no válido");
  let phone = value.trim().replace(/[\s().-]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  else if (!phone.startsWith("+")) phone = `+${phone}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new ValidationError("Ingrese un número internacional válido (E.164), por ejemplo +51999999999");
  }
  return phone;
}

/** Actualiza el nombre del negocio activo. Solo OWNER. El slug no cambia. */
export async function updateTenantName(userId: string, input: { name?: unknown }) {
  const active = await getActiveTenantForUser(userId);
  if (!active) throw new ForbiddenError("Seleccione un negocio");
  await assertTenantOwner(userId, active.id);
  const name = validateName(typeof input.name === "string" ? input.name : "");
  const tenant = await getPrisma().tenant.update({
    where: { id: active.id },
    data: { name },
    select: { id: true, name: true, slug: true, whatsappPhone: true },
  });
  return tenant;
}

/** Configura el WhatsApp del negocio activo. Solo OWNER. */
export async function updateTenantWhatsapp(userId: string, input: { phone?: unknown }) {
  const active = await getActiveTenantForUser(userId);
  if (!active) throw new ForbiddenError("Seleccione un negocio");
  await assertTenantOwner(userId, active.id);

  const phone = normalizeWhatsappPhone(input.phone);
  const tenant = await getPrisma().tenant.update({
    where: { id: active.id },
    data: { whatsappPhone: phone },
    select: { id: true, name: true, slug: true, whatsappPhone: true },
  });
  return tenant;
}

/** Verificación de permiso de administración de membresías (Fase 1: solo OWNER). */
export async function assertTenantOwner(userId: string, tenantId: string) {
  const membership = assertTenantMembership(
    await findMembership(userId, tenantId),
    tenantId,
    userId,
  );
  return assertRole(membership, [OWNER_ROLE]);
}
