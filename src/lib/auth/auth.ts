import "server-only";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { getPrisma } from "../db/prisma";

function createAuthInstance() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET debe tener al menos 32 caracteres");
  }

  // Por defecto las cookies son Secure. AUTH_COOKIES_SECURE=false está pensado
  // únicamente para el acceso local por HTTP en Docker; producción debe usar HTTPS.
  const secureCookies = process.env.AUTH_COOKIES_SECURE !== "false";

  return betterAuth({
    database: prismaAdapter(getPrisma(), { provider: "postgresql" }),
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
        // input:false evita que el cliente modifique el negocio activo.
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
      useSecureCookies: secureCookies,
    },
    trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
  });
}

let cachedAuth: ReturnType<typeof createAuthInstance> | null = null;

/**
 * Inicialización diferida: permite compilar la imagen sin BETTER_AUTH_SECRET.
 * El secreto se exige en el primer uso en tiempo de ejecución.
 */
export function getAuth() {
  if (!cachedAuth) {
    cachedAuth = createAuthInstance();
  }
  return cachedAuth;
}
