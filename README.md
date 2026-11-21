# One-Touch-Ecommerce

Plataforma SaaS multi-tenant para tiendas online, landings, flujos de venta, conversaciones de WhatsApp y pedidos. Esta entrega contiene la fundación (Fase 1) y su entorno de ejecución Dockerizado (Fase 1.1): autenticación, multi-tenancy, panel principal, PostgreSQL y migraciones automáticas.

**No es necesario instalar Node.js en Windows ni ejecutar `npm run dev` o `npm start`.** La aplicación se sirve desde un contenedor.

## Requisitos

- Docker Desktop en ejecución.
- Puertos libres: `3000` (aplicación). PostgreSQL no se publica en Windows.

## Puesta en marcha

Desde la carpeta del proyecto, en PowerShell:

```powershell
cd "C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce"
Copy-Item .env.example .env
notepad .env
```

Completa `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` (≥ 32 caracteres), `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `SEED_USER_NAME` y `SEED_TENANT_NAME`. Puedes generar el secreto con:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
```

Después levanta todo:

```powershell
docker compose up -d --build
docker compose ps
```

Abre **http://localhost:3000**. Serás redirigido a `/login`.

> `AUTH_COOKIES_SECURE=false` en `.env` permite que las cookies funcionen por HTTP en localhost. En un despliegue real, elimina esa variable y sirve la aplicación por HTTPS.

## Comandos habituales

```powershell
docker compose up -d --build      # construir/actualizar imágenes y arrancar
docker compose ps                 # estado de contenedores
docker compose logs -f app        # logs de Next.js en tiempo real
docker compose stop               # detener sin borrar nada
docker compose start              # volver a arrancar
```

Cuando cambie el código fuente, vuelve a construir:

```powershell
docker compose up -d --build
```

La imagen usa `output: "standalone"` de Next.js; `docker compose start` reutiliza la imagen ya construida.

## Migraciones

El servicio `migrate` ejecuta `prisma migrate deploy` usando las migraciones existentes antes de arrancar la aplicación. Usa el hostname interno `db`. No se usa `db push` y no se ejecuta seed automáticamente.

Para volver a aplicar migraciones manualmente:

```powershell
docker compose run --rm migrate
```

## Usuario inicial (seed controlado)

El arranque **no** crea usuarios. Para crear el usuario local y su negocio:

```powershell
docker compose run --rm seed
```

El seed lee `SEED_*` de `.env` y es idempotente (si el usuario ya existe y tiene un negocio, no hace nada). No necesitas npm en Windows.

Para crear un segundo usuario/negocio sin editar `.env`:

```powershell
docker compose run --rm -e SEED_USER_EMAIL=otro@local.test -e SEED_TENANT_NAME="Otro Negocio" seed
```

## Verificación técnica sin tests

```powershell
docker compose exec app node -e "fetch('http://127.0.0.1:3000/login').then(r=>console.log(r.status))"
docker compose logs app
```

Si necesitas lint, typecheck o build directos en Windows (opcional), con Node 24 instalado: `npm run lint`, `npm run typecheck`, `npm run build`.

## Servicios

| Servicio | Contenedor | Función | Red |
|---|---|---|---|
| `app` | `one-touch-ecommerce-app` | Next.js standalone en `0.0.0.0:3000` | `one-touch-network` |
| `db` | `one-touch-ecommerce-db` | PostgreSQL 16-alpine, volumen persistente | `one-touch-network` |
| `migrate` | `one-touch-ecommerce-migrate` | `prisma migrate deploy` (unica ejecución) | `one-touch-network` |
| `seed` | `one-touch-ecommerce-seed` | Seed manual (perfil `tools`) | `one-touch-network` |

El puerto de PostgreSQL no se publica en el host. La documentación técnica está en `docs/`.
