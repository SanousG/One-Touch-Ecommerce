# Arquitectura

## Entorno Docker

`db` (PostgreSQL 16, red interna `db:5432`), `migrate` (`prisma migrate deploy` antes de `app`), `app` (Next.js standalone, usuario no root, puerto 3000), `migrate-dev` y `seed` (perfil `tools`). Volúmenes: `one-touch-ecommerce-pgdata-dev` y `one-touch-ecommerce-product-uploads`.

## Capas

1. **Administración**: DAL de sesión, guards, servicios de catálogo/tenant y API `/api/admin/*`.
2. **Tienda pública**: `src/lib/store/service.ts` (`server-only`) resuelve la tienda por slug y consulta solo datos publicables. No importa módulos de sesión ni usa `activeTenantId`.
3. **Carrito del cliente**: `src/lib/store/cart.ts` (localStorage) + `useSyncExternalStore`. Guarda únicamente `variantId` y cantidad. Clave separada por `tenantId`.
4. **API pública**: `/api/store/[tenantSlug]/cart/validate`, `/whatsapp/product` y `/whatsapp/cart`. Todas revalida contra PostgreSQL antes de responder.

## Rutas públicas

| Ruta | Función |
|---|---|
| `/tienda/[tenantSlug]` | Catálogo con búsqueda y filtros por categoría |
| `/tienda/[tenantSlug]/producto/[productSlug]` | Ficha con galería, variantes, cantidad y WhatsApp |
| `/tienda/[tenantSlug]/carrito` | Carrito por negocio y envío por WhatsApp |

El `tenantSlug` se resuelve en servidor y determina todos los `where`. Un slug inexistente devuelve 404. La estructura por slug permite en el futuro mapear un dominio personalizado al mismo slug mediante un rewrite, sin cambiar la capa de datos (no implementado).

## Reglas de publicación

- Producto visible solo si `tenantId` coincide, `status = ACTIVE` y `storeVisible = true`.
- Variantes mostradas solo con `isActive = true`.
- Categorías e imágenes se obtienen por el mismo `tenantId` del producto.
- Precio representativo: menor precio de variantes activas; si hay varios precios distintos se muestra «Desde S/ …». Si no hay variantes activas, «Consultar precio».
- La imagen pública vuelve a validar autorización en cada petición y responde `Cache-Control: no-store`.

## Carrito

- Clave: `one-touch:cart:<tenantId>`. Dos negocios nunca comparten entradas.
- Payload: `[{ variantId, quantity }]`. Cantidades enteras 1..99.
- Al cargar el carrito se envía a `/cart/validate`: se descartan variantes inactivas, productos ocultos/archivados o de otro tenant y se recuperan precios vigentes del servidor.
- Modificar cantidades no crea pedidos ni reserva stock. No hay tabla de carritos ni de pedidos.

## WhatsApp (Click to Chat)

- `Tenant.whatsappPhone` (E.164, opcional) se edita solo en `/dashboard/configuracion` por OWNER.
- Ficha: `POST /whatsapp/product` revalida variante/cantidad y genera un mensaje con producto, variante, cantidad, precio referencial por unidad y SKU.
- Carrito: `POST /whatsapp/cart` revalida todas las líneas y genera un mensaje numerado con subtotal calculado en servidor con `DECIMAL`.
- `whatsappUrl()` construye `https://wa.me/<digits>?text=<encodeURIComponent(message)>`.
- El enlace abre un chat; el usuario debe pulsar Enviar. No hay API oficial, chatbot, conversaciones ni seguimiento.

Los mensajes incluyen referencias (SKU) y cantidades que en el futuro podrán usarse para reconocer productos al conectar el chatbot; hoy son solo texto.

## Modelo añadido en 2B

`Tenant.whatsappPhone String?` (migración `20261121020655_tenant_whatsapp`). El resto del modelo de catálogo permanece igual.

## Seguridad

La autorización pública se basa solo en el slug y el estado de publicación. Las mutaciones administrativas siguen exigiendo sesión, negocio activo y rol. No se exponen costos internos, stock, ni datos de otros tenants. Las cookies por defecto son `Secure`; en local `AUTH_COOKIES_SECURE=false`.
