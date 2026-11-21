// Ejecuta un comando (por ejemplo `prisma migrate deploy`) contra la BD de pruebas.
import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env" });

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("Falta TEST_DATABASE_URL en .env");
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Uso: node scripts/prepare-test-db.mjs <comando> [argumentos]");
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: url },
});

process.exit(result.status ?? 1);
