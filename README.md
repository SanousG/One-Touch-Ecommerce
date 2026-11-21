# One-Touch-Ecommerce

Plataforma SaaS multi-tenant: panel administrativo, catálogo, tienda pública, carritos por negocio y **landings de producto**. Todo se ejecuta en Docker Desktop sin `npm run dev`.

## Arranque

```powershell
cd "C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce"
Copy-Item .env.example .env   # solo la primera vez
docker compose up -d --build
docker compose ps
```

Panel: http://localhost:3000/login — usa `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` de `.env` (crea el usuario con `docker compose run --rm seed`).

## Landings de producto

Administración:

```
/dashboard/landings              # listado y creación
/dashboard/landings/[id]         # editor: contenido + vista previa en vivo
/dashboard/landings/[id]/preview # vista previa privada (noindex, no-store)
```

Flujo: crear landing desde un producto existente → guardar borrador → previsualizar → publicar. El borrador y la versión pública son snapshots independientes: editar el borrador **no** cambia la página pública hasta publicar.

Pública (sin login), en piloto:

```
http://localhost:3000/tienda/ganga-online-1dtlkl/landing/barra-led-recargable
```

Formato general: `/tienda/[tenantSlug]/landing/[landingSlug]`. Devuelve 404 si no hay versión publicada, si el producto está oculto/archivado o si el tenant no corresponde.

Permisos: OWNER crea, edita, guarda y publica. OPERATOR crea, edita y guarda borradores, pero **no puede publicar**.

## Comandos Docker

```powershell
docker compose up -d --build
docker compose logs -f app
docker compose stop
docker compose start
docker compose run --rm migrate
docker compose run --rm seed
docker compose run --rm migrate-dev npx prisma migrate dev --name <nombre> --create-only
```

## Otras rutas públicas

```
/tienda/[tenantSlug]                         # catálogo
/tienda/[tenantSlug]/producto/[productSlug]  # ficha
/tienda/[tenantSlug]/carrito                 # carrito por negocio
```

El WhatsApp se configura por negocio en `/dashboard/configuracion` (solo OWNER). Los enlaces Click to Chat abren un mensaje; no lo envían ni crean pedidos.

Verificación técnica: `npm run lint`, `npm run typecheck`, `npm run build`. Sin pruebas automatizadas. Más detalle en `docs/`.
