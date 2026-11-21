# Historial de implementación

## Fase 1 (resumen)

Fundación de One-Touch-Ecommerce: Next.js 16 + App Router, TypeScript, Tailwind 4, PostgreSQL con Prisma 7, Better Auth con registro cerrado, roles OWNER/OPERATOR, panel privado con selector de negocio, estados vacíos, seed local y documentación. La base quedó operativa y sin dependencias innecesarias.

## Fase 1.1 — Dockerización y simplificación

### A. Resultado general

**Completo.** La plataforma se levanta con `docker compose up -d --build` y está disponible en `http://localhost:3000` sin ejecutar Node, `npm run dev` ni `npm start` en Windows. Se retiró todo el código de pruebas automatizadas y se conservó la funcionalidad de la Fase 1.

### B. Archivos creados, eliminados y modificados

**Creados**

- `Dockerfile` (multi-stage: `base`, `deps`, `builder`, `migrator`, `runner`).
- `.dockerignore`.
- `public/.gitkeep` (directorio público requerido por Next standalone).

**Eliminados**

- `tests/` (carpeta completa).
- `vitest.config.mts`.
- `scripts/` (`prepare-test-db.mjs` y el directorio).
- Servicio `postgres-test` y volumen de testing de la configuración de Compose (el volumen real de Docker **no** se borró).

**Modificados**

- `package.json` y `package-lock.json`: scripts y dependencias de testing retirados.
- `docker-compose.yml`: servicios `db`, `migrate`, `app` y `seed` (perfil `tools`).
- `next.config.ts`: `output: "standalone"`.
- `src/lib/auth/auth.ts`: inicialización diferida, control de cookies por `AUTH_COOKIES_SECURE`.
- `src/lib/db/prisma.ts`: cliente Prisma diferido (`getPrisma()`).
- `src/lib/auth/session.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/api/tenants/route.ts`, `src/app/api/tenants/switch/route.ts`, `prisma/seed.ts`: adaptados a `getAuth()` / `getPrisma()`.
- `prisma.config.ts`: URL con valor alternativo solo para compilación.
- Páginas `/`, `/login`, `/dashboard`, `/onboarding`: `force-dynamic`.
- `.env.example`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, este archivo.
- `opencode.json` y `REPORTE_STITCH.md`: sin cambios.

### C. Dependencias de testing eliminadas

- `vitest` 5.1.1 (y su árbol transitivo).
- `@types/pg` 8.15.5.
- Scripts: `test`, `test:watch`, `db:migrate:test`.
- Configuración: `vitest.config.mts`.

`npm install` actualizó `package-lock.json`. `npm audit` sigue en 0 vulnerabilidades. No se añadió ningún framework de pruebas.

### D. Arquitectura Docker implementada

- Imagen base `node:24-bookworm-slim` con OpenSSL y certificados (necesarios para Prisma 7).
- `deps`: `npm ci` reproducible con `package-lock.json`.
- `builder`: `prisma generate` + `next build` con output standalone.
- `migrator`: CLI de Prisma, esquema, migraciones y cliente generado; sin entrar en la imagen final.
- `runner`: usuario no root `nextjs` (uid 1001), copia de `.next/standalone`, `.next/static` y `public`; `node server.js` en `0.0.0.0:3000`.
- Red bridge `one-touch-network`; PostgreSQL sin publicación de puerto en Windows.

### E. Servicios y contenedores configurados

| Servicio | Contenedor | Estado observado | Función |
|---|---|---|---|
| `db` | `one-touch-ecommerce-db` | Up (healthy) | PostgreSQL 16-alpine, red interna |
| `migrate` | `one-touch-ecommerce-migrate` | Exited (completado) | `prisma migrate deploy` |
| `app` | `one-touch-ecommerce-app` | Up (healthy) | Next.js standalone, puerto 3000 |
| `seed` | `one-touch-ecommerce-seed` | Perfil `tools`, manual | Creación controlada del usuario local |

### F. Funcionamiento de PostgreSQL y persistencia

- Base `one_touch_dev`, usuario definido en `.env`, hostname `db:5432` dentro de la red.
- Volumen `one-touch-ecommerce-pgdata-dev` reutilizado de la Fase 1; los datos se conservaron.
- Healthcheck `pg_isready` con 15 reintentos; `db` debe estar healthy antes de migrar y arrancar la app.
- Nota: existe el volumen histórico `one-touch-ecommerce_one-touch-ecommerce-pgdata-test` de la Fase 1. **No se eliminó.** Tampoco se borraron los contenedores huérfanos `one-touch-ecommerce-postgres-dev` y `one-touch-ecommerce-postgres-test` (quedaron detenidos).

### G. Funcionamiento de Prisma y migraciones

- `migrate` ejecuta `npm run db:migrate:deploy` → `prisma migrate deploy`.
- Salida real: «1 migration found in prisma/migrations» → «No pending migrations to apply» (la migración ya estaba aplicada en el volumen conservado).
- Verificación en BD: `_prisma_migrations` contiene `20261121003339_init` con `finished_at` del 21/11/2026.
- No se usó `db push`, no se regeneró la migración inicial y no se ejecutaron borrados.

### H. Estado de autenticación y multi-tenancy

Conservado sin cambios funcionales: login/logout de Better Auth, sesiones en cookies, hash scrypt, registro cerrado, rate limiting, roles OWNER/OPERATOR, selector de negocio y protección cross-tenant.

En Docker local se usa `AUTH_COOKIES_SECURE=false`, por lo que la cookie es `better-auth.session_token` (funciona sobre HTTP). El valor por defecto del código sigue siendo `Secure`; producción debe usar HTTPS y no definir esa variable.

### I. Comandos exactos en PowerShell

```powershell
cd "C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce"
docker compose up -d --build
docker compose ps
docker compose logs -f app
docker compose stop
docker compose start
```

Migraciones y seed:

```powershell
docker compose run --rm migrate
docker compose run --rm seed
```

Tras cambios de código: `docker compose up -d --build`.

### J. Validaciones realizadas y resultados reales

| Validación | Resultado |
|---|---|
| `docker compose config --quiet` | ✅ válido |
| `docker compose up -d --build` | ✅ imágenes `app` y `migrator` construidas; contenedores creados |
| `docker compose ps` | ✅ `db` y `app` Up (healthy); `migrate` Exited correctamente |
| `npm run lint` | ✅ 0 errores, 0 advertencias |
| `npm run typecheck` | ✅ sin errores |
| `npm run build` | ✅ standalone generado; 4 páginas dinámicas + `_not-found` |
| `npm audit` | ✅ 0 vulnerabilidades |
| Migraciones | ✅ `20261121003339_init` registrada en `_prisma_migrations` |
| `GET /login` | ✅ 200, contiene el formulario |
| `GET /dashboard` anónimo | ✅ 307 → `/login?next=%2Fdashboard` |
| `POST /api/auth/sign-in/email` | ✅ 200, cookie `better-auth.session_token` |
| `GET /api/auth/get-session` | ✅ sesión válida con `activeTenantId` |
| `GET /dashboard` autenticado | ✅ 200, “Resumen de hoy”, estado vacío y negocio activo |
| `POST /api/tenants/switch` negocio propio | ✅ 200 |
| `POST /api/tenants/switch` negocio ajeno | ✅ 403 `No pertenece a ese negocio` |
| Login de segundo negocio | ✅ 200 y dashboard muestra “Negocio B local” |
| `docker compose logs app` | ✅ sin errores ni advertencias críticas |

No se crearon archivos de pruebas ni se instaló ningún framework de testing.

### K. Problemas encontrados y soluciones aplicadas

1. `prisma generate` fallaba en el build por falta de `DATABASE_URL` → `prisma.config.ts` usa un valor alternativo solo para compilación; en runtime Compose inyecta la URL real con hostname `db`.
2. El prerenderizado de `/` exigía `BETTER_AUTH_SECRET` → inicialización diferida de Better Auth y `force-dynamic` en las páginas que usan sesión.
3. `PrismaClient` se creaba al importar → cliente diferido (`getPrisma()`).
4. El servicio `seed` no encontraba `.prisma/client` → se añadió `npx prisma generate` a la etapa `migrator`.
5. Advertencia de contenedores huérfanos de la Fase 1 → se detuvieron sin eliminarlos; el volumen de testing se conservó.
6. Cookies `Secure` sobre HTTP local → `AUTH_COOKIES_SECURE=false` explícito solo en el entorno local.

### L. Estado final de Docker Compose

Dos contenedores activos y saludables (`app`, `db`), `migrate` completado, `seed` bajo perfil `tools`. Sin puertos de PostgreSQL expuestos. Sin volúmenes ni contenedores eliminados.

### M. Estado de Git

Cambios de la Fase 1.1 confirmados en un commit con mensaje «Fase 1.1: dockerizacion y simplificacion». `.env`, `node_modules`, `.next` y `.git` quedan fuera del repositorio/imagen. `opencode.json` y la conexión MCP de Stitch permanecen intactos.

### N. Recomendaciones para la siguiente fase

1. Definir `tenantId` obligatorio en cada modelo nuevo y usar `requireDashboardContext()`.
2. Aprobar el flujo de alta de negocios antes de habilitar registro o invitaciones.
3. Añadir `AuditLog` y almacenamiento externo para rate limiting antes de escalar réplicas.
4. Servir por HTTPS en producción y retirar `AUTH_COOKIES_SECURE=false`.
5. Incorporar verificación E2E solo cuando existan módulos con interacción real.

No se avanzó a la Fase 2 ni se añadieron funcionalidades nuevas.
