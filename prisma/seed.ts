import { config } from "dotenv";

config({ path: ".env" });

import { auth } from "../src/lib/auth/auth";
import { prisma } from "../src/lib/db/prisma";
import { createTenantForUser } from "../src/lib/tenants/service";

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME ?? "Administrador";
  const tenantName = process.env.SEED_TENANT_NAME ?? "Ganga Online";

  if (!email || !password) {
    throw new Error("Defina SEED_USER_EMAIL y SEED_USER_PASSWORD en .env");
  }

  const context = await auth.$context;
  const passwordHash = await context.password.hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name },
    update: { name },
  });

  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
    create: {
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password: passwordHash,
    },
    update: { password: passwordHash },
  });

  const existingMembership = await prisma.tenantMembership.findFirst({
    where: { userId: user.id },
  });
  if (!existingMembership) {
    await createTenantForUser(user.id, { name: tenantName });
  }

  console.log(`Usuario local listo: ${email}`);
  console.log(`Negocio de demostración: ${tenantName}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
