import { config } from "dotenv";

config({ path: ".env" });

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error("Falta TEST_DATABASE_URL. Copie .env.example a .env antes de probar.");
}

// Todas las pruebas usan exclusivamente la base de datos de pruebas.
process.env.DATABASE_URL = url;
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length >= 32
    ? process.env.BETTER_AUTH_SECRET
    : "SecretoDePruebasSoloLocal1234567890abcdef";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
