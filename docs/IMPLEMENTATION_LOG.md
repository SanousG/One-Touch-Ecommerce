# REPORTE FASE 1 — One-Touch-Ecommerce

Fecha de ejecución: 21 de noviembre de 2026 (hora local).
Proyecto: `C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce`.

---

## A. Resumen de lo implementado y estado final

Se construyó desde cero la fundación de la plataforma: Next.js 16 con App Router, TypeScript, Tailwind 4, ESLint, Prisma 7 sobre PostgreSQL, Docker Compose con dos bases independientes, autenticación con Better Auth (correo/contraseña, sesiones en cookies, logout, registro público deshabilitado, rate limiting), arquitectura multi-tenant con roles OWNER/OPERATOR, panel privado con selector de negocio y estados vacíos, flujo de creación/selección de negocio, seed local, 12 pruebas automatizadas y documentación técnica.

Estado final: **todas las verificaciones ejecutadas pasaron** (lint, TypeScript, 12/12 pruebas, build de producción y migraciones en ambas bases). No se implementó ningún módulo de fases posteriores. No se desplegó la aplicación.

## B. Versiones exactas de las tecnologías instaladas

| Tecnología | Versión |
|---|---|
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| Docker | 29.8.0 (build 88096ef) |
| Docker Compose | v5.5.1 |
| Next.js | 16.4.6 |
| React / React DOM | 19.3.0 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.3.3 |
| @tailwindcss/turbopack | 4.3.3 |
| ESLint | 9.39.5 |
| eslint-config-next | 16.4.6 |
| Better Auth | 1.7.27 |
| Prisma / @prisma/client | 7.10.1 |
| @prisma/adapter-pg | 7.10.1 |
| pg | 8.16.3 |
| Vitest | 5.1.1 |
| tsx | 4.23.15 |
| dotenv | 17.4.2 |
| server-only | 0.0.1 |
| @types/node | 24.19.2 |
| @types/react / @types/react-dom | 19.3.0 |
| @types/pg | 8.15.5 |
| PostgreSQL (imagen Docker) | 16-alpine |

`npm audit`: **0 vulnerabilidades** (se aplicó un override de `effect` a 3.22.5 para corregir el aviso de ReDoS transitive de `@prisma/config`).

## C. Estructura de carpetas y principales archivos creados

```
src/
  app/
    globals.css                     # Tokens Tailwind 4 e Inter
    layout.tsx / page.tsx           # Root layout y redirección según sesión
    login/page.tsx                  # Pantalla de login (diseño Stitch)
    onboarding/page.tsx             # Creación del primer negocio
    dashboard/layout.tsx            # Shell privado + verificación de sesión
    dashboard/page.tsx              # Inicio con estados vacíos
    api/auth/[...all]/route.ts      # Handler de Better Auth
    api/tenants/route.ts            # POST crear negocio
    api/tenants/switch/route.ts     # POST cambiar negocio activo
  components/
    auth/ (login-form, logout-button)
    tenants/ (tenant-switcher, create-tenant-form)
    dashboard/ (sidebar, header, empty-state)
    ui/icon.tsx                     # 24 iconos SVG propios
  lib/
    auth/ (auth, client, guards, session)
    db/prisma.ts
    tenants/ (service, context)
  proxy.ts                          # Filtro optimista de rutas (Next 16)
prisma/
  schema.prisma / seed.ts
  migrations/20261121003339_init/migration.sql
prisma.config.ts
docker-compose.yml
.env.example                        # Plantilla sin secretos
vitest.config.mts
scripts/prepare-test-db.mjs
tests/ (auth.test.ts, tenancy.test.ts, helpers.ts, setup.ts)
README.md
docs/ (ARCHITECTURE, DESIGN_SYSTEM, DECISIONS, IMPLEMENTATION_LOG)
```

Se conservaron sin modificar `opencode.json` (conexión MCP de Stitch) y `REPORTE_STITCH.md`.

## D. Arquitectura multi-tenant y funcionamiento del aislamiento

- `TenantMembership` es la fuente de verdad de pertenencia; `User.activeTenantId` es solo la selección y se valida siempre contra las membresías.
- `createTenantForUser()` crea en una transacción el `Tenant`, la membresía `OWNER` del creador y actualiza su negocio activo.
- `switchTenantForUser()` verifica la membresía **dentro** de la transacción antes de escribir `activeTenantId`.
- `getTenantForUser()`, `listUserTenants()` y `assertTenantOwner()` filtran siempre por `userId`.
- Un ID ajeno en ruta o body devuelve 403; nunca expone datos del otro negocio.
- El cambio de negocio no mezcla permisos: el rol se lee de la membresía del negocio activo.
- `proxy.ts` hace solo una comprobación optimista de cookie; la autorización real está en el DAL (`requireUser`) y en los servicios.

## E. Modelos de datos y migraciones

Tablas: `users`, `sessions`, `accounts`, `verifications` (Better Auth), `tenants`, `tenant_memberships`.
Enum: `TenantRole { OWNER, OPERATOR }`.
Restricciones: `users.email` único, `sessions.token` único, `accounts(providerId, accountId)` único, `tenants.slug` único, `tenant_memberships(tenantId, userId)` único; índices en `activeTenantId`, `sessions.userId`, `sessions.expiresAt`, `verifications.identifier`, `verifications.expiresAt`, `(userId, role)` y `(tenantId, role)`; cascadas borrado usuario/negocio → sesiones, cuentas y membresías.

Migración: `prisma/migrations/20261121003339_init/migration.sql`, aplicada a `one_touch_dev` (5432) y `one_touch_test` (5433).

## F. Autenticación y medidas de seguridad implementadas

- Correo y contraseña con Better Auth; hash scrypt mediante la primitiva de la biblioteca (`auth.$context.password.hash`).
- Registro público deshabilitado (`disableSignUp: true`) hasta aprobar el alta de negocios.
- Sesiones persistentes en cookies httpOnly + SameSite=Lax; `Secure` automático en producción (requiere HTTPS). `cookieCache` desactivado.
- Rate limiting: 30/min global, 5/min para `/sign-in/email`; verificado con prueba (401 ×5 → 429).
- Errores de credenciales genéricos e idénticos para usuario inexistente y contraseña incorrecta.
- `activeTenantId` declarado con `input: false`, por lo que el cliente no puede manipularlo.
- Rutas privadas protegidas por `proxy` + DAL; verificación en cada página.
- Contraseñas y secretos solo en `.env` (gitignored); `.env.example` contiene marcadores.

## G. Diseños de Stitch utilizados y diferencias frente a los diseños

Consultados exclusivamente mediante el MCP integrado, proyecto `projects/1619124812250481064`:

- Login: `screens/47969c62b0b846f896c019fd3337c4ab`.
- Panel: `screens/5483e3738b1949a3a85e23d772853fb8`.

Se analizaron componentes, rejilla, paleta y jerarquía; no se copió HTML. Diferencias principales:

1. “Ganga Online” dejó de ser fija: el selector muestra el negocio activo resuelto en servidor.
2. No se muestran cifras de ventas, conversaciones ni pedidos: estados vacíos con guiones.
3. El estado “WhatsApp Sincronizado” se cambió por “WhatsApp · próximamente” (módulo no implementado).
4. Las entradas de navegación futuras están deshabilitadas con etiqueta “Pronto”.
5. Paleta Stitch (`#faf8ff` / `#3525cd`) ajustada a la base indicada (`#F8FAFC` / `#4F46E5`).
6. Iconos Material Symbols sustituidos por SVG propios; Inter se carga por `@import` de Google Fonts.

Detalle completo en `docs/DESIGN_SYSTEM.md`. No se guardaron archivos de credenciales de Stitch.

## H. Pruebas ejecutadas, resultados reales, errores y advertencias

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores, 0 advertencias |
| `npm run typecheck` | ✅ sin errores |
| `npm test` | ✅ 2 archivos, 12/12 pruebas, 2.77 s |
| `npm run build` | ✅ compilación y 8 páginas generadas; rutas dinámicas correctas |
| `npm run db:migrate` | ✅ migración aplicada a BD de desarrollo |
| `npm run db:migrate:test` | ✅ migración aplicada a BD de pruebas |
| `npm run db:seed` | ✅ usuario local y negocio de demostración creados |
| `npm audit` | ✅ 0 vulnerabilidades |
| Prueba de humo HTTP local (`npm run dev`) | ✅ `/login` 200; `/dashboard` anónimo 307 → `/login`; login 200 + cookie; `/dashboard` autenticado 200 con “Resumen de hoy”, negocio activo y estados vacíos |

Escenario de pruebas: dos negocios (`Negocio A`, `Negocio B`) y dos usuarios distintos (OWNER de cada uno); el usuario A es además OPERATOR en B. Casos cubiertos: anónimo rechazado, login válido/inválido, logout, registro público cerrado, rate limit, creación con OWNER, cambio autorizado, rechazo de negocio ajeno, rechazo sin rol OWNER, aislamiento de listados/active tenant/membresías y unicidad de membresía.

Incidencias encontradas y resueltas:

1. Vitest 3 y Prisma 6 presentaban avisos de seguridad → se migró a Vitest 5.1.1 y Prisma 7.10.1 con adapter `pg`; se añadió `override` de `effect`.
2. Prisma 7 no carga `.env` en `prisma.config.ts` → se añadió `dotenv.config()`.
3. El seed importaba módulos `server-only` desde Node → se instaló `server-only` y se ejecuta con `--env-file` y `--conditions=react-server`.
4. La prueba de rate limit llamaba a `auth.api.signInEmail`, que omite el middleware del router → se cambió al handler HTTP real (`auth.handler`), confirmando 429.
5. Aviso de Vite sobre configuración ESM → `vitest.config.ts` renombrado a `.mts`.
6. Al probar `npm start` sobre HTTP, las cookies `Secure` no se reenvían (comportamiento esperado); la verificación funcional se realizó con `npm run dev`. En producción se requiere HTTPS.

## I. Instrucciones exactas para levantar el sistema en Windows PowerShell

```powershell
cd "C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce"
Copy-Item .env.example .env
notepad .env
```

En `.env` define `POSTGRES_PASSWORD`, `DATABASE_URL`, `TEST_DATABASE_URL`, `BETTER_AUTH_SECRET` (≥ 32 caracteres), `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `SEED_USER_NAME` y `SEED_TENANT_NAME`. Genera el secreto con:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
```

Después:

```powershell
docker compose up -d
npm ci
npm run db:generate
npm run db:migrate
npm run db:migrate:test
npm run db:seed
npm run dev
```

El usuario local de prueba se crea con el seed usando únicamente las variables `SEED_USER_EMAIL` y `SEED_USER_PASSWORD` de `.env`; sus valores no se reproducen en este reporte. Ingresa en http://localhost:3000 con esas credenciales. Para verificar: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## J. Problemas encontrados, decisiones técnicas y cambios propuestos

Ver `docs/DECISIONS.md`. Decisiones críticas: Better Auth con registro cerrado, DAL centralizado, guardas puras, Route Handlers delgados sobre servicios, BD de pruebas real, estados vacíos. Cambios propuestos: almacenamiento de rate limit en `secondaryStorage` para múltiples instancias, modelo `AuditLog` con `tenantId` si se requiere trazabilidad, y flujo de invitación de operadores cuando se apruebe el alta de negocios.

## K. Funcionalidades que quedaron pendientes

Catálogo de productos, carrito, tienda pública, landings de campaña, editor visual de diagramas, WhatsApp, chatbot IA, pedidos, inventario, pagos y publicación en redes. Tampoco hay interfaz para invitar operadores ni panel de administración de membresías.

## L. Recomendaciones para la siguiente fase (sin implementar)

1. Definir el contrato `tenantId` obligatorio para todos los modelos nuevos y reutilizar `requireDashboardContext()`.
2. Aprobación del flujo de incorporación de negocios antes de habilitar registro o invitaciones.
3. Diseñar el editor visual como módulo independiente con persistencia versionada por tenant.
4. Introducir `AuditLog` y `secondaryStorage` antes de escalar a varias instancias.
5. Añadir E2E con Playwright cuando existan módulos con interacción real.

## M. Identificación de archivos modificados y estado de Git

El directorio no era un repositorio Git; se inicializó uno para dejar trazabilidad. Commit único: “Fase 1: fundacion multi-tenant, autenticacion y panel” (54 archivos). `.env`, `node_modules` y `.next` están excluidos por `.gitignore`. `opencode.json` y `REPORTE_STITCH.md` se conservaron. No se modificaron otros repositorios.
