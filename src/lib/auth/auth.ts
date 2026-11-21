import "server-only";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { prisma } from "../db/prisma";

/**
 * Fábrica exported para las pruebas: cada instancia tiene su propio
 * almacén de rate limiting en memoria.
 */
export function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET debe tener al menos 32 caracteres");
  }

  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret,
    emailAndPassword: {
      enabled: true,
      // El alta pública de clientes queda deshabilitada hasta aprobar el flujo
      // definitivo de incorporación de negocios.
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    user: {
      additionalFields: {
        // input:false evita que el cliente modify el negocio activo.
        activeTenantId: { type: "string", required: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
  });
}

export const auth = createAuth();
export type AuthInstance = ReturnType<typeof createAuth>;
