import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { ForbiddenError } from "@/lib/auth/guards";
import {
  assertTenantOwner,
  createTenantForUser,
  getActiveTenantForUser,
  getTenantForUser,
  listUserTenants,
  switchTenantForUser,
} from "@/lib/tenants/service";
import { cleanDatabase, createUserWithPassword } from "./helpers";

let ownerAId: string;
let ownerBId: string;
let tenantAId: string;
let tenantBId: string;

beforeAll(async () => {
  await cleanDatabase();

  const ownerA = await createUserWithPassword("owner.a@example.test", "Dueño A");
  const ownerB = await createUserWithPassword("owner.b@example.test", "Dueño B");
  ownerAId = ownerA.id;
  ownerBId = ownerB.id;

  const tenantA = await createTenantForUser(ownerAId, { name: "Negocio A" });
  const tenantB = await createTenantForUser(ownerBId, { name: "Negocio B" });
  tenantAId = tenantA.id;
  tenantBId = tenantB.id;

  // El dueño A es operador invitado en el negocio B (sin permisos de administración).
  await prisma.tenantMembership.create({
    data: { tenantId: tenantBId, userId: ownerAId, role: "OPERATOR" },
  });
});

describe("arquitectura multi-tenant", () => {
  it("crea un negocio asignando OWNER al creador", async () => {
    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: tenantAId, userId: ownerAId } },
    });
    expect(membership?.role).toBe("OWNER");

    const active = await getActiveTenantForUser(ownerAId);
    expect(active?.id).toBe(tenantAId);
  });

  it("permite cambiar entre negocios a los que el usuario pertenece", async () => {
    const switched = await switchTenantForUser(ownerAId, tenantBId);
    expect(switched.id).toBe(tenantBId);
    expect(switched.role).toBe("OPERATOR");

    const active = await getActiveTenantForUser(ownerAId);
    expect(active?.id).toBe(tenantBId);

    const back = await switchTenantForUser(ownerAId, tenantAId);
    expect(back.isActive).toBe(true);
    expect((await getActiveTenantForUser(ownerAId))?.id).toBe(tenantAId);
  });

  it("rechaza el acceso a un negocio ajeno modificando el identificador", async () => {
    await expect(getTenantForUser(ownerBId, tenantAId)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(switchTenantForUser(ownerBId, tenantAId)).rejects.toBeInstanceOf(ForbiddenError);

    const userB = await prisma.user.findUniqueOrThrow({ where: { id: ownerBId } });
    expect(userB.activeTenantId).toBe(tenantBId);
  });

  it("rechaza operaciones de administración sin rol OWNER", async () => {
    await expect(assertTenantOwner(ownerAId, tenantBId)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(assertTenantOwner(ownerBId, tenantBId)).resolves.toMatchObject({
      role: "OWNER",
    });
  });

  it("aísla negocios, membresías y negocio activo entre usuarios", async () => {
    const listA = await listUserTenants(ownerAId);
    const listB = await listUserTenants(ownerBId);

    expect(listA.map((tenant) => tenant.id).sort()).toEqual([tenantAId, tenantBId].sort());
    expect(listB.map((tenant) => tenant.id)).toEqual([tenantBId]);

    expect(listA.filter((tenant) => tenant.isActive).map((tenant) => tenant.id)).toEqual([
      tenantAId,
    ]);
    expect(listB.filter((tenant) => tenant.isActive).map((tenant) => tenant.id)).toEqual([
      tenantBId,
    ]);

    const membershipsA = await prisma.tenantMembership.findMany({ where: { userId: ownerAId } });
    const membershipsB = await prisma.tenantMembership.findMany({ where: { userId: ownerBId } });
    expect(membershipsA).toHaveLength(2);
    expect(membershipsB).toHaveLength(1);

    // Una consulta directa sin filtrar por membresía no es equivalente a la del DAL.
    const allTenants = await prisma.tenant.findMany();
    expect(allTenants).toHaveLength(2);
    expect(allTenants.every((tenant) => listB.some((item) => item.id === tenant.id))).toBe(false);
  });

  it("no permite duplicar la membresía de un usuario en el mismo negocio", async () => {
    await expect(
      prisma.tenantMembership.create({
        data: { tenantId: tenantBId, userId: ownerAId, role: "OPERATOR" },
      }),
    ).rejects.toThrow();
  });
});
