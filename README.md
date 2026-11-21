# One-Touch-Ecommerce

Plataforma SaaS multi-tenant: autenticación, catálogo, tienda pública, landings, editor de flujos e **inventario y pedidos operativos**. Todo se ejecuta en Docker Desktop sin `npm run dev`.

## Arranque

```powershell
cd "C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce"
Copy-Item .env.example .env   # solo la primera vez
docker compose up -d --build
docker compose ps
```

Panel: http://localhost:3000/login — `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` de `.env` (crea el usuario con `docker compose run --rm seed`).

## Módulos

| Ruta | Función |
|---|---|
| `/dashboard/products` | Catálogo; acción Crear/Abrir flujo y estado real del flujo |
| `/dashboard/inventory` | Stock físico, reservado y disponible; ajustes e historial |
| `/dashboard/orders` | Pedidos; `/orders/new` manual; `/orders/[id]` detalle y acciones |
| `/dashboard/landings` | Landings con borrador/publicación |
| `/dashboard/flows` | Editor visual de flujos de venta |
| `/dashboard/templates` | Plantillas de mensaje y checkout |
| `/dashboard/configuracion` | WhatsApp del negocio (solo OWNER) |

Flujo comercial: ajustar stock inicial → crear pedido manual (reserva atómica) → adjuntar/verificar adelanto → iniciar preparación → despachar (descuenta stock) → entregar → registrar cobro. El dashboard muestra pendientes reales.

Público: `/tienda/[tenantSlug]`, `/producto/[productSlug]`, `/carrito`, `/landing/[landingSlug]`. Piloto: `/tienda/ganga-online-1dtlkl`.

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

Detalle técnico en `docs/ORDER_AND_INVENTORY.md` y `docs/SALES_FLOW_ENGINE.md`.

Verificación: `npm run lint`, `npm run typecheck`, `npm run build`. Sin pruebas automatizadas.
