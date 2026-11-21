# One-Touch-Ecommerce

Plataforma SaaS multi-tenant con autenticación, catálogo, tienda pública, landings y **editor visual de flujos de venta**. Todo se ejecuta en Docker Desktop sin `npm run dev`.

## Arranque

```powershell
cd "C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce"
Copy-Item .env.example .env   # solo la primera vez
docker compose up -d --build
docker compose ps
```

Panel: http://localhost:3000/login — `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` de `.env` (crea el usuario con `docker compose run --rm seed`).

## Módulos administrativos

| Ruta | Función |
|---|---|
| `/dashboard/products` | Catálogo; acción **Crear flujo** / **Abrir flujo** y estado real del flujo |
| `/dashboard/landings` | Landings de producto con borrador/publicación |
| `/dashboard/flows` | Flujos de venta por producto y flujos globales |
| `/dashboard/flows/[id]` | Editor visual (React Flow), inspector, simulador y publicación |
| `/dashboard/templates` | Plantillas de mensaje y checkout reutilizables |
| `/dashboard/configuracion` | Número de WhatsApp del negocio (solo OWNER) |

Flujo de trabajo: crear plantillas → crear flujo desde un producto → añadir/conectar bloques → guardar borrador → **Probar flujo** → publicar (solo OWNER). Editar después no altera la versión publicada.

## Rutas públicas

```
/tienda/[tenantSlug]                                  # catálogo
/tienda/[tenantSlug]/producto/[productSlug]           # ficha
/tienda/[tenantSlug]/carrito                          # carrito
/tienda/[tenantSlug]/landing/[landingSlug]            # landing publicada
```

Piloto: `/tienda/ganga-online-1dtlkl`.

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

El simulador **no envía mensajes**, no crea pedidos ni reserva stock. El chatbot real y la API de WhatsApp están pendientes. Detalle técnico en `docs/SALES_FLOW_ENGINE.md`.

Verificación: `npm run lint`, `npm run typecheck`, `npm run build`. Sin pruebas automatizadas.
