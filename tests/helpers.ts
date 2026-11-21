import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export const TEST_PASSWORD = "ClaveDePrueba123!";

export async function cleanDatabase() {
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.tenantMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

export async function createUserWithPassword(email: string, name = "Usuario de prueba") {
  const context = await auth.$context;
  const password = await context.password.hash(TEST_PASSWORD);
  const user = await prisma.user.create({ data: { email, name } });
  await prisma.account.create({
    data: {
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password,
    },
  });
  return user;
}

export function cookieHeaderFrom(response: Response): string {
  const cookies = response.headers.getSetCookie();
  if (cookies.length === 0) throw new Error("La respuesta no devolvió cookies");
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
