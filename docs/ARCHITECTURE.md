# Arquitectura

## Entorno Docker

`db` (PostgreSQL 16, red interna `db:5432`), `migrate` (`prisma migrate deploy` antes de `app`), `app` (Next.js standalone, no root, puerto 3000), `migrate-dev` y `seed` (perfil `tools`). Volúmenes: `one-touch-ecommerce-pgdata-dev` y `one-touch-ecommerce-product-uploads`.

## Módulos

1. **Administración**: sesión Better Auth, guards, servicios de tenants/catálogo/landings y API `/api/admin/*`.
2. **Tienda pública**: `src/lib/store/service.ts` resuelve por slug, sin sesión.
3. **Carrito**: localStorage por `tenantId`, revalidado en servidor.
4. **Landings**: `src/lib/landings/service.ts` gestiona borradores/versiones, permisos y la vista pública; `LandingView` se reutiliza en editor, preview y página pública.

## Landings: modelo de versiones

- `Landing` pertenece a un tenant y a un producto (`@@unique([tenantId, productId])`: una landing por producto en esta etapa) y tiene `slug` único por tenant.
- `draftVersionId` y `publishedVersionId` apuntan a snapshots distintos de `LandingVersion`.
- Publicar cambia solo el puntero `publishedVersionId` en una transacción; no muta el contenido publicado.
- Guardar borrador sobre una versión ya publicada crea un **nuevo** snapshot, por lo que la pública sigue intacta.
- `revision` + `expectedRevision` dan concurrencia optimista: si otra pestaña guardó primero, se responde 409.
- `LandingVersion.heroImageId` tiene FK `onDelete: Restrict`. Una imagen usada por una landing no se puede eliminar desde el catálogo (409), evitando páginas públicas rotas.

Contenido editable: titular, descripción, fotografía (solo imágenes del producto), beneficios y FAQ. Se valida longitud, máximos y ausencia de `<`/`>`; React escapea todo el texto. No hay HTML/JS/CSS arbitrario.

## Permisos

| Acción | OWNER | OPERATOR |
|---|---|---|
| Crear landing | ✅ | ✅ |
| Editar y guardar borrador | ✅ | ✅ |
| Vista previa privada | ✅ | ✅ |
| Publicar | ✅ | ❌ |

Todas las operaciones administrativas validan sesión, negocio activo, membresía y rol. Un ID ajeno devuelve 404; publicar ajeno también.

## Vista previa y cache

`/dashboard/landings/[id]/preview` exige sesión y membresía, usa el borrador y responde con `Cache-Control: no-store, private` y `X-Robots-Tag: noindex, nofollow` (configurado para `/dashboard/:path*`). No hay endpoint JSON que devuelva borradores.

La landing pública resuelve tenant por slug, exige versión publicada y producto `ACTIVE` + `storeVisible`, y usa metadatos de título/descripción del contenido publicado. Nunca consulta `activeTenantId` ni la sesión admin.

## WhatsApp

Reutiliza `Tenant.whatsappPhone` y `whatsappUrl()` de la Fase 2B. El mensaje de landing referencia el producto (SKU o slug) y, si hay varias variantes, pregunta por las opciones; no inventa una selección. Revalida la landing publicada en servidor antes de generar el enlace. No envía mensajes ni crea pedidos/conversaciones.

## Editor de flujos (Fase 3B)

La dependencia `@xyflow/react` 13 se usa solo en componentes cliente. `FlowEditor` mantiene nodos/conexiones en estado local, guarda posiciones y configuración, y serializa un `FlowDiagramDTO` validado en servidor (`normalizeDiagram`). El inspector ocupa 320 px; el lienzo usa el resto y cuenta con zoom, minimapa, cuadrícula y ajuste a la vista.

`SalesFlow` + `SalesFlowVersion` siguen el patrón de landings: `draftVersionId` y `publishedVersionId` separados, publicación transaccional, snapshots inmutables de plantillas y flujos globales, y concurrencia optimista con `revision`.

Validación de publicación: Inicio único con salida, sin conexiones huérfanas, ramas de decisión completas (incluido `fallback`), plantillas válidas, flujos globales publicados del mismo tenant, sin recursión global, salida terminal alcanzable, sin nodos inalcanzables y ciclos solo con salida explícita. Los errores se devuelven con `nodeId`/`edgeId`.

Permisos: OWNER y OPERATOR crean/editan/guardan y simulan; solo OWNER publica. Todo se filtra por `tenantId` en servidor.

## Motor comercial (Fase 4A)

`src/lib/commerce/service.ts` centraliza inventario, pedidos, reservas, adelantos, transiciones e historial. Todo filtra por `tenantId` y usa transacciones.

- `ProductVariant.stockPhysical/stockReserved` + `InventoryMovement` (auditável, nunca se borra).
- `StockReservation` por pedido y variante: `ACTIVE → RELEASED | CONSUMED`.
- `Order` + `OrderItem` con snapshots; `PaymentVoucher`, `OrderEvent`.
- Numeración por tenant con función PostgreSQL `next_order_number`.
- Concurrencia: `SELECT ... FOR UPDATE` sobre variantes; validación de todas las líneas antes de reservar.
- Idempotencia: `@@unique([tenantId, idempotencyKey])`.
- Estados de pago y preparación independientes; verificar adelanto no inicia preparación; entregar no marca pago.
- Comprobantes privados en `/app/storage/payment-vouchers`, endpoint con sesión y `no-store`.
- Tienda pública consulta `stockPhysical − stockReserved` y rechaza cantidades sin disponibilidad.

## WhatsApp multiproveedor (Fase 4B)

`src/lib/whatsapp/` define `WhatsAppProvider`, un registro con WasenderAPI disponible y Meta como proveedor futuro no disponible. Los módulos comerciales y de conversaciones no importan el cliente HTTP de Wasender; solo la interfaz.

Conexiones por tenant con credenciales cifradas AES-256-GCM (`WHATSAPP_ENCRYPTION_KEY`), `webhookId` opaco y unicidad global de `externalSessionId`. Webhook autenticado por comparación directa de `X-Webhook-Signature` con el secreto, eventos persistentes en `WebhookEvent` con deduplicación y payload sanitizado (sin `sessionId`).

Contactos, conversaciones, mensajes y eventos son independientes del proveedor. La cola `OutboundMessage` en PostgreSQL es procesada por el servicio `worker` de Docker Compose con claim atómico y reintentos controlados. La bandeja usa sondeo periódico (`router.refresh()` cada 6 s).

## Relación con fases futuras

Plantilla fija en 3A. La Fase 3B añadirá el editor visual de flujos; las landing seguirán siendo puntos de entrada al producto. El chatbot podrá usar la referencia del mensaje para identificar productos. Inventario y pedidos siguen pendientes.
