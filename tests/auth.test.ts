import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { auth, createAuth } from "@/lib/auth/auth";
import { assertAuthenticated, UnauthorizedError } from "@/lib/auth/guards";
import { proxy } from "@/proxy";
import { cleanDatabase, cookieHeaderFrom, createUserWithPassword, TEST_PASSWORD } from "./helpers";

const EMAIL = "auth.user@example.test";

beforeAll(async () => {
  await cleanDatabase();
  await createUserWithPassword(EMAIL, "Usuario Auth");
});

describe("autenticación", () => {
  it("rechaza a un usuario anónimo en rutas privadas", async () => {
    const response = proxy(new NextRequest("http://localhost:3000/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");

    expect(() => assertAuthenticated(null)).toThrow(UnauthorizedError);
  });

  it("permite el login con credenciales válidas y crea una sesión persistente", async () => {
    const response = await auth.api.signInEmail({
      body: { email: EMAIL, password: TEST_PASSWORD },
      asResponse: true,
    });
    expect(response.status).toBe(200);

    const cookie = cookieHeaderFrom(response);
    expect(cookie).toContain("session_token");

    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user.email).toBe(EMAIL);
  });

  it("rechaza credenciales inválidas sin filtrar información del usuario", async () => {
    const wrongPassword = await auth.api.signInEmail({
      body: { email: EMAIL, password: "ClaveIncorrecta123!" },
      asResponse: true,
    });
    const unknownUser = await auth.api.signInEmail({
      body: { email: "no.existe@example.test", password: TEST_PASSWORD },
      asResponse: true,
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);

    const wrongBody = (await wrongPassword.json()) as { message?: string };
    const unknownBody = (await unknownUser.json()) as { message?: string };
    expect(wrongBody.message).toBe(unknownBody.message);
    expect(wrongBody.message?.toLowerCase()).not.toMatch(/no existe|not found|usuario/);
  });

  it("cierra la sesión con logout", async () => {
    const signIn = await auth.api.signInEmail({
      body: { email: EMAIL, password: TEST_PASSWORD },
      asResponse: true,
    });
    const cookie = cookieHeaderFrom(signIn);
    expect((await auth.api.getSession({ headers: new Headers({ cookie }) }))?.user).toBeDefined();

    await auth.api.signOut({ headers: new Headers({ cookie }), asResponse: true });

    const after = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(after).toBeNull();
  });

  it("mantiene deshabilitado el registro público", async () => {
    const response = await auth.api.signUpEmail({
      body: { email: "publico@example.test", password: TEST_PASSWORD, name: "Público" },
      asResponse: true,
    });
    expect(response.status).not.toBe(200);
  });

  it("limita intentos repetidos de inicio de sesión", async () => {
    // Instancia nueva: su almacén de rate limiting en memoria empieza vacío.
    // Se usa el handler HTTP porque el rate limiting vive en el router.
    const isolatedAuth = createAuth();

    const signInRequest = (password: string) =>
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.77",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: EMAIL, password }),
      });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await isolatedAuth.handler(signInRequest("ClaveIncorrecta123!"));
      expect(response.status).toBe(401);
    }

    const blocked = await isolatedAuth.handler(signInRequest(TEST_PASSWORD));
    expect(blocked.status).toBe(429);
  });
});
