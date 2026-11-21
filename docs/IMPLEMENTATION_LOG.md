# Historial de implementación

## Fases anteriores (resumen)

Fase 1: multi-tenancy, Better Auth y panel. Fase 1.1: Dockerización y retirada de pruebas. Fase 2A: catálogo administrativo, variantes, imágenes y migraciones. Sin frameworks de testing.

## Fase 2B — Tienda pública, ficha y carrito

### A. Resumen de implementación

Se implementó la tienda pública por negocio con catálogo, fichas de producto, carrito por tenant y consultas Click to Chat por WhatsApp. Los datos provienen del catálogo real de PostgreSQL; las tiendas no requieren login y nunca usan la sesión administrativa. El carrito vive en localStorage separado por negocio y se revalida contra el servidor antes de mostrar precios o generar mensajes. No se crearon pedidos, reservas ni conversaciones.

### B. Archivos creados y modificados

**Creados (servidor)**

- `src/lib/store/service.ts`
- `src/lib/store/cart.ts`
- `prisma/migrations/20261121020655_tenant_whatsapp/migration.sql`
- `src/app/api/store/[tenantSlug]/cart/validate/route.ts`
- `src/app/api/store/[tenantSlug]/whatsapp/product/route.ts`
- `src/app/api/store/[tenantSlug]/whatsapp/cart/route.ts`
- `src/app/api/admin/tenants/whatsapp/route.ts`
- `src/app/tienda/[tenantSlug]/layout.tsx`
- `src/app/tienda/[tenantSlug]/page.tsx`
- `src/app/tienda/[tenantSlug]/producto/[productSlug]/page.tsx`
- `src/app/tienda/[tenantSlug]/carrito/page.tsx`
- `src/app/dashboard/configuracion/page.tsx`

**Creados (cliente)**

- `src/components/store/store-header.tsx`
- `src/components/store/store-footer.tsx`
- `src/components/store/store-catalog.tsx`
- `src/components/store/product-detail.tsx`
- `src/components/store/cart-view.tsx`
- `src/components/tenants/whatsapp-settings.tsx`

**Modificados**

- `prisma/schema.prisma`: `Tenant.whatsappPhone String?`.
- `src/lib/tenants/service.ts`: `getActiveTenantSettings()`, `normalizeWhatsappPhone()`, `updateTenantWhatsapp()`.
- `src/components/dashboard/sidebar.tsx`: “Configuración” activa.
- `src/components/ui/icon.tsx`: iconos `bag`, `minus`, `arrowLeft`, `whatsapp`.
- `src/app/api/images/[imageId]/file/route.ts`: `Cache-Control: no-store`.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, este archivo.

`opencode.json` y MCP de Stitch intactos. No se borraron volúmenes ni datos.

### C. Rutas públicas implementadas

| Ruta | Función |
|---|---|
| `/tienda/ganga-online-1dtlkl` | Catálogo público A |
| `/tienda/negocio-b-local-5shfty` | Catálogo público B |
| `/tienda/[tenantSlug]/producto/[productSlug]` | Ficha pública |
| `/tienda/[tenantSlug]/carrito` | Carrito por negocio |

API pública: `/api/store/[tenantSlug]/cart/validate`, `/api/store/[tenantSlug]/whatsapp/product` y `/api/store/[tenantSlug]/whatsapp/cart`.

### D. Funcionamiento del catálogo y fichas

Búsqueda por nombre, filtros por categoría, tarjetas con portada del volumen persistente, precio representativo («S/ …» o «Desde S/ …»), accesos a ficha y carrito y estado vacío. Solo se listan productos `ACTIVE` y `storeVisible=true` del tenant del slug; los productos DRAFT y ARCHIVED quedaron fuera en la validación real.

La ficha muestra galería, descripción real, variantes activas, cantidad (1–99), botones de carrito y WhatsApp. Con una sola variante se simplifica el selector. No se muestra disponibilidad de stock ni características inventadas; se aclara que disponibilidad/envío se confirman por WhatsApp.

### E. Funcionamiento del carrito

Clave `one-touch:cart:<tenantId>`; guarda solo `variantId` y cantidad. Al cargar, `POST /cart/validate` devuelve líneas con nombres, SKU, precios vigentes, totales y subtotal en `DECIMAL`; los artículos inválidos se quitan y se avisa al cliente. Cantidades 0, negativas y decimales se rechazan. Se verificó por separado que un carrito del negocio A no aparece en B y que la información persiste entre “recargas” simuladas.

### F. Integración básica con WhatsApp

`Tenant.whatsappPhone` se configura en `/dashboard/configuracion`, solo OWNER (validado con ForbiddenError para OPERATOR). El teléfono se normaliza a E.164.

Mensaje de ficha: producto, variante, cantidad, precio referencial por unidad y SKU; no incluye el carrito. Mensaje de carrito: líneas numeradas con variante y cantidad, y subtotal referencial calculado en servidor. Ambos usan `wa.me/<digits>?text=<encode>`. Se validó el contenido decodificado de ambos mensajes. Sin teléfono, los botones se desactivan y aparece un aviso; la API devuelve 409.

Abrir WhatsApp no envía el mensaje, no crea pedidos, no reserva stock y no registra pagos.

### G. Seguridad y aislamiento multi-tenant

- La identidad pública se resuelve por slug en servidor; un slug inexistente da 404.
- Todas las consultas de tienda incluyen `tenantId`, `ACTIVE` y `storeVisible`.
- Variantes, categorías, imágenes y carrito se validan contra el mismo tenant.
- Mensajes generados en servidor con datos vigentes.
- Imagen pública revalidada en cada petición (`no-store`); al ocultar un producto pasó a 404.
- Sin sesión administrativa ni `activeTenantId` en ninguna ruta pública.

### H. Diseños de Stitch utilizados

Proyecto `projects/1619124812250481064`:

- Catálogo: `screens/7bfbd07fc1f047cb9853ca8f3d5a4bfe`.
- Ficha: `screens/4f2a579343394d369953c3190022349e`.
- Carrito: `screens/1653e502de0441bfbaabdf3cf12eaa50`.

Se conservaron cabecera con marca, píldoras de categoría, rejilla de tarjetas, galería protagonista, selector de variantes/cantidad, resumen lateral y CTA verde de WhatsApp. Diferencias: sin badges de stock/descuentos ni importes ilustrativos; precios reales; secciones no implementadas marcadas como no disponibles; verde reservado a WhatsApp; paleta e Inter de la Fase 1. No se copió HTML.

### I. Migraciones y cambios de modelos

`20261121020655_tenant_whatsapp` añade `whatsappPhone` a `tenants`, sin valor por defecto y compatible con datos existentes. `migrate` aplicó 3 migraciones («3 migrations found», «Applying migration 20261121020655_tenant_whatsapp», «All migrations have been successfully applied»). No se usó `db push` ni se borraron datos. `_prisma_migrations` contiene las 3 migraciones.

### J. Validaciones manuales realizadas y sus resultados

| Validación | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores, 0 advertencias |
| `npm run typecheck` | ✅ sin errores |
| `npm run build` | ✅ 27 rutas, sin errores |
| `docker compose up -d --build` | ✅ migración aplicada, `app` healthy |
| Tienda A y B sin login | ✅ 200; A con productos, B con estado vacío inicial |
| Slug inexistente | ✅ 404 |
| DRAFT y ARCHIVED excluidos | ✅ no aparecen en HTML público |
| Filtros/búsqueda y categorías | ✅ componentes y rutas con query verificadas |
| Ficha A y B | ✅ 200; galería, variantes y cantidad presentes |
| Variante + cantidad | ✅ mensaje y carrito usan la variante elegida |
| Agregar/actualizar/quitar artículos y vaciar | ✅ módulo de carrito verificado con localStorage simulado |
| Persistencia del carrito entre cargas | ✅ mismo contenido tras nueva carga simulada |
| Separación de carritos A/B | ✅ clave distinta; el otro negocio devuelve [] |
| Mensaje WhatsApp de un producto | ✅ 200, `wa.me/51987654321`, nombre/variante/cantidad/SKU en el texto |
| Mensaje WhatsApp del carrito | ✅ 200, 2 líneas, subtotal referencial 279.70 calculado en servidor |
| Variante inactiva | ✅ rechazada en validación (0 líneas) y en WhatsApp (409) |
| Sin WhatsApp configurado | ✅ aviso en ficha/carrito y API 409 |
| OWNER configura teléfono | ✅ 200; OPERATOR rechazado con ForbiddenError |
| Cambio de precio | ✅ el carrito reflejó 95.50 sin confiar en el navegador |
| Cambio de visibilidad | ✅ ficha 404, carrito sin líneas y imagen 404; al restaurar, todo 200 |
| Imagen pública | ✅ 200 con `Cache-Control: no-store` |
| Sin tabla de pedidos | ✅ `information_schema` solo muestra las 11 tablas previas |
| Persistencia tras rebuild | ✅ productos, teléfonos e imagen conservados |
| Logs de `app` | ✅ sin errores críticos |

Incidencias menores resueltas: un script inicial eligió un producto DRAFT recién creado en vez del publicado; una comprobación asumió erróneamente que el usuario B era OPERATOR (es OWNER); un intento de limpiar el teléfono de B devolvió 500 porque el login había sido limitado por rate limit, por lo que se añadió mapeo explícito de 401 en el endpoint; el stub de localStorage usado en la verificación no tenía `dispatchEvent`.

### K. Estado de Docker Compose

`app` y `db` Up (healthy), `migrate` Exited correctamente, `seed`/`migrate-dev` bajo perfil `tools`. PostgreSQL sin puerto publicado. Sin volúmenes borrados.

### L. Problemas encontrados y soluciones

Ver J. Además, el endpoint de WhatsApp de carrito devuelve 409 con `issues` y el estado revalidado cuando algún artículo deja de estar disponible, para que el cliente revise antes de abrir el chat.

### M. Decisiones técnicas y recomendaciones

Ver `docs/DECISIONS.md`. Se priorizó revalidación server-side, separación por tenant y mensajería sin estado. Recomendado: object storage/CDN, dominios personalizados, inventario real y, más adelante, usar el SKU de estos mensajes como contexto del chatbot.

### N. Estado de Git

Commit de Fase 2B con mensaje «Fase 2B: tienda publica, ficha y carrito». Sin pruebas automatizadas añadidas. `.env`, volúmenes e imágenes fuera del repositorio.

### O. Pendientes de la siguiente fase

Pedidos/checkout, inventario con reservas y movimientos, chatbot/API de WhatsApp, flujo visual, y publicación/landings. No se implementaron aquí.
