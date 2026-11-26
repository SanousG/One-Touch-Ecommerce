import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Cliente diferido: la URL se lee en el primer uso real, no al importar el
 * módulo. Así la imagen puede compilarse sin credenciales de base de datos.
 */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta la variable de entorno DATABASE_URL");
  }

  const client = new PrismaClient({
    // Las funciones serverless crean varias instancias del proceso. El valor
    // predeterminado de `pg` (10 conexiones por instancia) agota rápidamente
    // el límite del pooler de Supabase, por lo que cada instancia usa una sola.
    adapter: new PrismaPg({
      connectionString,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    }),
  });

  globalForPrisma.prisma = client;
  return client;
}
