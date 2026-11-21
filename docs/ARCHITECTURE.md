# Arquitectura

## Entorno de ejecución (Fase 1.1)

Todo se ejecuta en Docker Desktop mediante `docker compose up -d --build`:

- **`db`**: PostgreSQL 16-alpine. No publica puerto en Windows; solo es alcanzable desde `one-touch-network` como `db:5432`. Persistencia en el volumen `one-touch-ecommerce-pgdata-dev`.
- **`migrate`**: servicio puntual construido desde el objetivo `migrator` del Dockerfile. Ejecuta `prisma migrate deploy` contra `db`. `app` depende de que termine correctamente (`service_completed_successfully`).
- **`app`**: imagen `runner` con el output `standalone` de Next.js 16. Escucha en `0.0.0.0:3000`, publicado en `localhost:3000`. Usuario no root. Healthcheck con `fetch` a `/login`.
- **`seed`**: mismo objetivo `migrator`, perfil `tools`, ejecución manual (`docker compose run --rm seed`).

El Dockerfile es multi-stage: `base` (Node 24 + OpenSSL), `deps` (`npm ci`), `builder` (Prisma Client + `next build` standalone), `migrator` (CLI de Prisma y tsx) y `runner` (solo `.next/standalone`, `.next/static` y `public`). `.dockerignore` excluye `.env*`, `node_modules`, `.next`, `.git`, documentación y archivos locales.

La inicialización de Prisma y de Better Auth es diferida (`getPrisma()`, `getAuth()`), de modo que la compilación no requiere secretos. Las páginas que dependen de sesión son `force-dynamic`.

## Capas de la aplicación

1. **Presentación (App Router).** Páginas de servidor y componentes cliente mínimos (`login-form`, `tenant-switcher`, `logout-button`). El HTML del panel se genera en el servidor.
2. **DAL de sesión (`src/lib/auth/session.ts`).** `getSession()` valida la cookie contra Better Auth/Prisma y se memoiza por render. `requireUser()` redirige a `/login` si no hay sesión.
3. **Guards puros (`src/lib/auth/guards.ts`).** `assertAuthenticated`, `assertTenantMembership` y `assertRole`.
4. **Servicios multi-tenant (`src/lib/tenants/service.ts`).** Único punto de creación, listado, selección y verificación de negocios. Toda consulta lleva el `userId` en el `where`.
5. **Datos (Prisma + PostgreSQL).** Esquema con constraints de unicidad e índices.

## Flujo de una petición privada

```
Request en localhost:3000
  -> proxy.ts (comprobación optimista de cookie)
  -> requireDashboardContext() en la página
       -> getSession() (validación real en BD vía hostname db)
       -> getActiveTenantForUser() (membresía verificada)
  -> render / respuesta
```

El `proxy` no es la barrera de seguridad: la autorización real está en el DAL y en los servicios, y debe repetirse en cada página, handler o acción nueva.

## Aislamiento multi-tenant

- `TenantMembership` es la única fuente de verdad de pertenencia; tiene `@@unique([tenantId, userId])`.
- `User.activeTenantId` guarda la selección, pero se valida siempre contra las membresías.
- `createTenantForUser()` crea negocio + membresía `OWNER` + negocio activo en una transacción.
- `switchTenantForUser()` comprueba la membresía dentro de la transacción antes de actualizar `activeTenantId`.
- `getTenantForUser()`, `listUserTenants()` y `assertTenantOwner()` filtran por `userId`; un ID ajeno devuelve 403.
- Los modelos futuros deberán incluir `tenantId` y filtrar por el negocio resuelto.

## Modelo de datos

| Tabla | Propósito | Restricciones relevantes |
|---|---|---|
| `users` | Better Auth + `activeTenantId` | `email` único, índice en `activeTenantId` |
| `sessions` | Sesiones persistentes | `token` único, índices `userId`/`expiresAt`, cascade |
| `accounts` | Cuenta de credenciales (hash) | único `(providerId, accountId)` |
| `verifications` | Tokens de Better Auth | índices `identifier`, `expiresAt` |
| `tenants` | Negocios | `slug` único |
| `tenant_memberships` | Relación N:M con rol | único `(tenantId, userId)`, índices por rol |

Roles: `OWNER` (creador) y `OPERATOR` (operativo). No hay interfaz para invitar operadores en esta fase.

## Puntos de extensión

- Nuevos módulos: añadir `tenantId` y usar `requireDashboardContext()` antes de consultar.
- Administración de membresías: usar `assertTenantOwner()` en el handler/acción.
- Rate limiting: hoy en memoria por contenedor; para múltiples réplicas configurar `secondaryStorage` de Better Auth.
- Producción: servir por HTTPS y quitar `AUTH_COOKIES_SECURE=false`.
