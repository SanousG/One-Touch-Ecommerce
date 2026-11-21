# One-Touch-Ecommerce

Plataforma SaaS multi-tenant: autenticación, negocios aislados, panel administrativo y **catálogo de productos** (Fase 2A). Todo se ejecuta en Docker Desktop; no hace falta Node.js en Windows ni `npm run dev`.

## Arranque

```powershell
cd "C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce"
Copy-Item .env.example .env   # solo la primera vez; completar valores
docker compose up -d --build
docker compose ps
```

Abre **http://localhost:3000** e inicia sesión con `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` de `.env` (crea el usuario con `docker compose run --rm seed` si aún no existe).

En local se usa `AUTH_COOKIES_SECURE=false` para que las cookies funcionen por HTTP. En producción: HTTPS y sin esa variable.

## Comandos

```powershell
docker compose up -d --build      # reconstruir tras cambios de código
docker compose ps
docker compose logs -f app
docker compose stop
docker compose start
docker compose run --rm migrate   # reaplicar migraciones existentes
docker compose run --rm seed      # crear usuario/negocio local (idempotente)
```

Para generar una migración nueva durante el desarrollo (bind mount del host):

```powershell
docker compose run --rm migrate-dev npx prisma migrate dev --name <nombre> --create-only
docker compose up -d --build
```

## Catálogo (Fase 2A)

Rutas: `/dashboard/products` (listado) y `/dashboard/products/[id]` (edición).

- Productos por negocio con slug único por tenant, categoría, descripción, estado `DRAFT`/`ACTIVE`/`ARCHIVED` y visibilidad en tienda.
- Variantes con SKU único por negocio, precio `DECIMAL(12,2)` en soles y campos de stock reservados para el inventario futuro.
- Categorías por negocio.
- Galería de imágenes: subida (JPEG/PNG/WebP, máx. 5 MB con validación de cabecera), portada, reordenado y eliminación.
- Búsqueda por nombre o SKU y filtros por categoría y visibilidad.
- No hay eliminación física de productos; solo archivado (reservado a `OWNER`).

Permisos iniciales: `OWNER` y `OPERATOR` pueden administrar productos, variantes, imágenes, categorías y visibilidad. Solo `OWNER` puede archivar/restaurar.

Las imágenes se guardan en el volumen Docker `one-touch-ecommerce-product-uploads` montado en `/app/storage`; sobreviven a reconstrucciones. Endpoints:
- Privados: `/api/admin/products/...` (requieren sesión y negocio activo validado).
- Público futuro: `/api/images/[imageId]/file` (solo productos `ACTIVE` y visibles en tienda).

## Servicios

| Servicio | Función |
|---|---|
| `app` | Next.js standalone, `0.0.0.0:3000`, publicado en `localhost:3000` |
| `db` | PostgreSQL 16, red interna `db:5432`, sin puerto en Windows |
| `migrate` | `prisma migrate deploy` antes de arrancar `app` |
| `migrate-dev` | Generación de migraciones en el host (perfil `tools`) |
| `seed` | Usuario local manual (perfil `tools`) |

## Verificación técnica

```powershell
npm run lint
npm run typecheck
npm run build
```

Sin suites de pruebas automatizadas. Más detalle en `docs/`.
