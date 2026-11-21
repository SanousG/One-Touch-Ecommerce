# One-Touch-Ecommerce — Fase 1

Plataforma SaaS multi-tenant para tiendas online, landings, flujos de venta, conversaciones de WhatsApp y pedidos. Esta entrega contiene **únicamente la fundación**: autenticación, multi-tenancy, panel principal y diagnosticos. Los módulos de negocio se implementarán en fases posteriores.

## Requisitos verificados

| Herramienta | Versión comprobada |
|---|---|
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| Docker | 29.8.0 (build 88096ef) |
| Docker Compose | v5.5.1 |

## Instalación en Windows PowerShell

1. Ubícate en la carpeta del proyecto:

```powershell
cd "C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce"
```

2. Copia la plantilla de entorno y complétala:

```powershell
Copy-Item .env.example .env
notepad .env
```

genera un secreto de Better Auth de al menos 32 caracteres:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
```

Define `POSTGRES_PASSWORD`, `DATABASE_URL`, `TEST_DATABASE_URL`, `BETTER_AUTH_SECRET`, `SEED_USER_EMAIL` y `SEED_USER_PASSWORD`. **No compartas el contenido de `.env`.**

3. Levanta PostgreSQL de desarrollo (5432) y de pruebas (5433):

```powershell
docker compose up -d
docker compose ps
```

4. Instala dependencias y prepara la base de datos:

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run db:migrate:test
npm run db:seed
```

5. Arranca la aplicación:

```powershell
npm run dev
```

Abre http://localhost:3000. Serás redirigido a `/login`. Ingresa con el correo y la contraseña que definiste en `.env` (`SEED_USER_EMAIL` / `SEED_USER_PASSWORD`). El seed crea también el negocio de demostración indicado en `SEED_TENANT_NAME`.

## Verificación

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Para producción, la app usa cookies `Secure`; por ello debe servirse sobre HTTPS. En local usa `npm run dev` (HTTP).

## Comandos útiles

| Comando | Descripción |
|---|---|
| `npm run db:studio` | Explorador visual de Prisma |
| `npm run db:migrate -- --name <nombre>` | Nueva migración |
| `npm run test:watch` | Pruebas en modo observación |
| `docker compose down` | Detener los contenedores del proyecto |

## Estructura

```
src/
  app/                 # App Router: login, onboarding, dashboard, API
  components/          # UI reutilizable (auth, tenants, dashboard, ui)
  lib/
    auth/              # Better Auth, guards y DAL de sesión
    db/                # Cliente Prisma
    tenants/           # Servicios multi-tenant y contexto
  proxy.ts             # Comprobación optimista de rutas (Next 16)
prisma/                # Esquema, migraciones y seed
tests/                 # Pruebas de autenticación y aislamiento
docs/                  # Documentación técnica
```

La documentación completa está en `docs/`. El informe de la Fase 1 está en `docs/IMPLEMENTATION_LOG.md`.
