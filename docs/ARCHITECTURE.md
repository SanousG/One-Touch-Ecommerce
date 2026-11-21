# Arquitectura

## Capas

1. **Presentación (App Router).** Páginas de servidor y componentes cliente mínimos (`login-form`, `tenant-switcher`, `logout-button`). El HTML del panel se genera en el servidor; los componentes cliente solo gestionan interacción.
2. **DAL de sesión (`src/lib/auth/session.ts`).** `getSession()` valida la cookie contra Better Auth/Prisma y se memoiza por render. `requireUser()` redirige a `/login` si no hay sesión.
3. **Guards puros (`src/lib/auth/guards.ts`).** `assertAuthenticated`, `assertTenantMembership` y `assertRole`. No dependen de Next, por lo que son verificables en pruebas.
4. **Servicios multi-tenant (`src/lib/tenants/service.ts`).** Único punto de creación, listado, selección y verificación de negocios. Toda consulta lleva el `userId` en el `where`.
5. **Datos (Prisma + PostgreSQL).** Esquema con constraints de unicidad e índices.

## Flujo de una petición privada

```
Request
  -> proxy.ts (solo comprueba presencia de cookie; optimista)
  -> requireDashboardContext() en la página
       -> getSession() (validación real en BD)
       -> getActiveTenantForUser() (membresía verificada)
  -> render / respuesta
```

El `proxy` **no** es la barrera de seguridad: es un filtro rápido. La autorización real está en el DAL y en los servicios, y debe repetirse en cada página, Server Action o Route Handler nuevo.

## Aislamiento multi-tenant

- `TenantMembership` es la única fuente de verdad de pertenencia. Tiene `@@unique([tenantId, userId])`.
- `User.activeTenantId` guarda la selección del usuario, pero **nunca se confía sin verificar** la membresía: `getActiveTenantForUser()` la cruza con `TenantMembership`.
- `createTenantForUser()` crea negocio + membresía `OWNER` + negocio activo en una sola transacción.
- `switchTenantForUser()` comprueba la membresía dentro de la transacción antes de actualizar `activeTenantId`.
- `getTenantForUser(userId, tenantId)` y `assertTenantOwner()` exigen membresía; cambiar un ID en la URL o en el body produce `ForbiddenError` (403), nunca datos de otro negocio.
- No existe una tabla global de "datos del negocio" compartida; los modelos futuros (productos, pedidos, etc.) deberán incluir `tenantId` y filtrar por el negocio resuelto.

## Modelo de datos

| Tabla | Propósito | Restricciones relevantes |
|---|---|---|
| `users` | Better Auth + `activeTenantId` | `email` único, índice en `activeTenantId` |
| `sessions` | Sesiones persistentes | `token` único, índices en `userId` y `expiresAt`, cascade |
| `accounts` | Cuenta de credenciales (hash) | único `(providerId, accountId)`, índice `userId` |
| `verifications` | Tokens de Better Auth | índices `identifier`, `expiresAt` |
| `tenants` | Negocios | `slug` único |
| `tenant_memberships` | Relación N:M con rol | único `(tenantId, userId)`, índices `(userId, role)` y `(tenantId, role)` |

Roles: `OWNER` (creador, administración) y `OPERATOR` (acceso operativo). En Fase 1 no hay interfaz para invitar operadores; el seed y las pruebas crean membresías directamente.

## Puntos de extensión para fases posteriores

- Nuevos módulos: añadir `tenantId` y usar `requireDashboardContext()` antes de consultar.
- Administración de membresías: usar `assertTenantOwner()` en el handler/acción.
- Migrar de Route Handlers a Server Actions es posible sin cambiar los servicios.
- Rate limiting: hoy en memoria; para múltiples instancias configurar `secondaryStorage` de Better Auth.
