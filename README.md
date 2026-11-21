# One-Touch-Ecommerce

Plataforma SaaS multi-tenant con panel administrativo y tienda pública por negocio. Todo se ejecuta en Docker Desktop; no hace falta Node.js en Windows ni `npm run dev`.

## Arranque

```powershell
cd "C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce"
Copy-Item .env.example .env   # solo la primera vez; completar valores
docker compose up -d --build
docker compose ps
```

Panel: http://localhost:3000 (inicia sesión con `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`; crea el usuario con `docker compose run --rm seed`).

Tiendas públicas (sin login):

```
/tienda/[tenantSlug]
/tienda/[tenantSlug]/producto/[productSlug]
/tienda/[tenantSlug]/carrito
```

Los slugs se generan al crear el negocio; en el piloto: `/tienda/ganga-online-1dtlkl` y `/tienda/negocio-b-local-5shfty`.

## Comandos Docker

```powershell
docker compose up -d --build      # reconstruir tras cambios de código
docker compose ps
docker compose logs -f app
docker compose stop
docker compose start
docker compose run --rm migrate   # reaplicar migraciones existentes
docker compose run --rm seed      # usuario local (idempotente)
docker compose run --rm migrate-dev npx prisma migrate dev --name <nombre> --create-only
```

## WhatsApp por negocio

En `/dashboard/configuracion` el **OWNER** define el número en formato internacional (`+51999999999`). Los OPERATOR pueden verlo pero no editarlo. Si no hay número, la tienda muestra claramente que la consulta no está disponible y los botones se desactivan.

Los enlaces usan `https://wa.me/<digits>?text=...` con el mensaje codificado. Se abren en una pestaña nueva; **no envían el mensaje automáticamente**, no crean pedidos ni reservan stock.

## Catálogo y tienda

- Administración: `/dashboard/products` y `/dashboard/products/[id]`.
- Catálogo público: solo productos `ACTIVE` y `storeVisible=true` del negocio del slug. Nunca depende de la sesión administrativa ni del `activeTenantId`.
- Carrito: `localStorage` con clave `one-touch:cart:<tenantId>`; guarda solo `variantId` y cantidad. Los precios se revalidan siempre en el servidor.
- Imágenes públicas: `/api/images/[imageId]/file` con `Cache-Control: no-store`; solo sirve imágenes de productos activos y visibles.

## Verificación técnica

```powershell
npm run lint
npm run typecheck
npm run build
```

Sin suites de pruebas automatizadas. Más detalle en `docs/`.
