import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no carga .env automáticamente en el archivo de configuración.
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
