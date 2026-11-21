import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no carga .env automáticamente en el archivo de configuración.
config({ path: ".env" });

// En Docker los valores llegan como variables de entorno del contenedor.
// El valor alternativo solo permite compilar la imagen sin exponer secretos.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
