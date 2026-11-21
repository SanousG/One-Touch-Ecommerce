# Historial de implementación

## Fase 1 y 1.1 (resumen)

Base multi-tenant con Better Auth, panel privado, Docker Compose (app/db/migrate/seed), volúmenes persistentes y migración inicial. Sin código de pruebas automatizadas.

## Fase 2A — Catálogo administrativo

### A. Resumen de implementación

Se añadió un catálogo administrativo por negocio con productos, categorías, variantes y galería de imágenes. Se implementaron las dos vistas aprobadas en Stitch (listado y edición) con componentes React/Tailwind propios, una API privada verificada por tenant y una superficie pública de imágenes preparada para la tienda futura. Todo funciona dentro de Docker; no se añadieron pruebas automatizadas.

### B. Archivos creados y modificados

**Creados (modelo y lógica)**

- `prisma/migrations/20261121014930_catalog/migration.sql`.
- `src/lib/utils/slug.ts`, `src/lib/auth/permissions.ts`.
- `src/lib/catalog/service.ts`, `src/lib/catalog/http.ts`.
- `src/lib/storage/product-images.ts`.

**Creados (API)**

- `src/app/api/admin/products/route.ts`
- `src/app/api/admin/products/[id]/route.ts`
- `src/app/api/admin/products/[id]/variants/route.ts`
- `src/app/api/admin/products/[id]/variants/[variantId]/route.ts`
- `src/app/api/admin/products/[id]/images/route.ts`
- `src/app/api/admin/products/[id]/images/[imageId]/route.ts`
- `src/app/api/admin/products/images/[imageId]/file/route.ts`
- `src/app/api/admin/categories/route.ts`
- `src/app/api/images/[imageId]/file/route.ts`

**Creados (UI)**

- `src/components/catalog/products-view.tsx`
- `src/components/catalog/product-editor.tsx`
- `src/components/catalog/variant-manager.tsx`
- `src/components/catalog/image-manager.tsx`
- `src/app/dashboard/products/page.tsx`
- `src/app/dashboard/products/[id]/page.tsx`

**Modificados**

- `prisma/schema.prisma`: enum `ProductStatus` y modelos `Category`, `Product`, `ProductVariant`, `ProductImage`; relaciones en `Tenant`.
- `src/components/ui/icon.tsx`: nuevos iconos SVG.
- `src/components/dashboard/sidebar.tsx`: “Productos” pasó a ser navegación activa.
- `src/lib/tenants/service.ts`: `getMembershipRole()`.
- `docker-compose.yml`: variable `PRODUCT_UPLOAD_DIR`, volumen `one-touch-ecommerce-product-uploads`, servicio `migrate-dev`.
- `Dockerfile`: creación del directorio `/app/storage` con propietario `nextjs`.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, este archivo.

`opencode.json` y la conexión MCP de Stitch no se modificaron.

### C. Modelos de datos y migraciones

| Tabla | Campos clave |
|---|---|
| `categories` | `tenantId`, `name`, `slug`, `description`; único `(tenantId, slug)` |
| `products` | `tenantId`, `categoryId?`, `name`, `slug`, `description?`, `status` (`DRAFT`/`ACTIVE`/`ARCHIVED`), `storeVisible`; único `(tenantId, slug)`; índices por tenant+estado y tenant+categoría |
| `product_variants` | `tenantId`, `productId`, `sku`, `name`, `price DECIMAL(12,2)`, `isActive`, `isDefault`, `stockPhysical`, `stockReserved`; único `(tenantId, sku)` |
| `product_images` | `tenantId`, `productId`, `storageKey` (único), `fileName`, `mimeType`, `sizeBytes`, `position`, `isCover` |

Migración `20261121014930_catalog` generada con `prisma migrate dev --name catalog --create-only` dentro de Docker (bind mount del host). La inicial no se tocó. `migrate` aplicó la nueva migración: salida «2 migrations found» → «Applying migration 20261121014930_catalog» → «All migrations have been successfully applied». Consulta posterior: `_prisma_migrations` contiene `20261121003339_init` y `20261121014930_catalog`.

### D. Funcionamiento de productos, categorías y variantes

- Listado con búsqueda por nombre o SKU (insensible a mayúsculas), filtro por categoría y visibilidad, conteo y estados vacíos.
- Creación con variante predeterminada (nombre, SKU opcional y precio). El SKU se normaliza en mayúsculas conservando guiones.
- Edición de nombre, categoría, descripción y estado; precio editable desde la sección de variantes.
- Variantes: alta, edición de nombre/SKU/precio y activación/desactivación; `isDefault` se asigna a la primera.
- Categorías: alta desde un diálogo y asociación por negocio.
- Visibilidad y archivado se alternan desde el listado (archivar/restaurar solo para OWNER). No existe borrado físico.

### E. Gestión y persistencia de imágenes

- Subida multipart con validación de MIME (JPEG/PNG/WebP), firma binaria (no solo extensión) y límite de 5 MB; se rechazó una carga SVG con respuesta 400/404.
- Portada, reordenado y eliminación en transacciones; al borrar la portada se reasigna a la primera restante.
- Archivos: `PRODUCT_UPLOAD_DIR=/app/storage/product-images`, volumen `one-touch-ecommerce-product-uploads`, usuario `nextjs`. Se validó que tras `docker compose up -d --build` siguen 2 archivos en el volumen y siguen descargándose.
- Acceso privado: `/api/admin/products/images/[id]/file` (`private, no-store`). Acceso público: `/api/images/[id]/file` (`public, max-age=3600`), que solo responde 200 si el producto está `ACTIVE` y `storeVisible`; en `DRAFT` devolvió 404.

### F. Seguridad y aislamiento multi-tenant

- `getApiCatalogContext()` y `requireCatalogContext()` validan sesión, negocio activo y membresía en cada operación.
- Todas las consultas incluyen `tenantId`; un producto de otro negocio devuelve 404 y un cambio de negocio devuelve 403.
- Categorías de otro negocio se rechazan al crear/editar productos.
- Transacciones para producto+variante, portada, orden y borrado de imágenes.
- Permisos: OWNER y OPERATOR administran el catálogo; solo OWNER archiva/restaura.
- No se debilitaron rate limiting, cookies ni guards existentes.

### G. Pantallas de Stitch implementadas

Proyecto `projects/1619124812250481064`:

- Listado: `screens/927f207470fb440f99b269fd030ca478` — *Productos — Ganga Online*.
- Edición: `screens/03eda08376f746aabb1f7f2e245f1ef0` — *Editar producto — Barra LED recargable*.

Se conservaron estructura de tabla, barra de filtros, cabeceras con acciones, tarjetas de información/variantes/galería y jerarquía visual. Diferencias: se usan los tokens base de la Fase 1 (`#4F46E5`, `#F8FAFC`, Inter); los datos son reales de la BD; las secciones de stock, flujo del bot, WhatsApp y ficha pública aparecen como “no disponible” en esta fase; no se muestran cifras de stock ni estados de flujo inventados.

### H. Validaciones ejecutadas con resultados reales

| Validación | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores, 0 advertencias |
| `npm run typecheck` | ✅ sin errores |
| `npm run build` | ✅ 19 rutas, sin errores (2 avisos de tracing resueltos con `turbopackIgnore`) |
| `docker compose up -d --build` | ✅ imágenes reconstruidas, migración aplicada, `app` healthy |
| Login OWNER A | ✅ 200 con cookie |
| Listado inicial | ✅ 0 productos |
| Crear categoría “Iluminación” | ✅ 201 |
| Crear producto + variante | ✅ 201 (2 variantes tras añadir otra) |
| Editar descripción | ✅ 200 |
| Crear segunda variante | ✅ 201 |
| Subir 2 imágenes PNG | ✅ 201 (1 y 2 imágenes) |
| Cambiar portada | ✅ 200 |
| Reordenar imágenes | ✅ 200 |
| Descarga privada de imagen | ✅ 200 `image/png` |
| Búsqueda por nombre | ✅ 1 resultado |
| Búsqueda por SKU | ✅ 1 resultado (con el SKU real `BLR30K`; la primera comprobación usó `BLR-30K` y falló, se corrigió la normalización del SKU para conservar guiones) |
| Filtro por categoría | ✅ 1 resultado |
| Cambiar visibilidad | ✅ 200 `storeVisible=true` |
| Archivar (OWNER) | ✅ 200 `ARCHIVED`; restauración a `DRAFT` ✅ |
| Producto ajeno (usuario B) | ✅ 404 |
| Listado/categorías del negocio B | ✅ 0 productos, sin la categoría de A |
| Rechazo de SVG | ✅ 400 |
| Páginas `/dashboard/products` y `/dashboard/products/[id]` | ✅ 200 |
| Imagen pública en DRAFT / ACTIVE+visible | ✅ 404 / 200 |
| Persistencia tras rebuild | ✅ producto, 2 variantes, 2 imágenes y archivos conservados |
| Logs de `app` | ✅ sin errores críticos |

No se crearon archivos ni frameworks de pruebas.

### I. Estado de los contenedores Docker

`app` Up (healthy, `0.0.0.0:3000->3000/tcp`), `db` Up (healthy, `5432/tcp` sin publicar en Windows), `migrate` Exited correctamente, `seed` y `migrate-dev` bajo perfil `tools`. Sin borrado de volúmenes ni contenedores de otros proyectos.

### J. Problemas encontrados y soluciones aplicadas

1. Búsqueda por SKU fallida en la primera validación: la normalización eliminaba guiones (`BLR-30K` → `BLR30K`). Se cambió para conservarlos y se repitió la comprobación.
2. Avisos de Turbopack por acceso dinámico a filesystem: se añadieron comentarios `turbopackIgnore` en el módulo de storage.
3. `PrismaUpdateInput` no acepta `categoryId`: se sustituyó por `category: { connect/disconnect }`.
4. Icono `edit` ausente: se añadió al conjunto SVG.
5. Advertencia de contenedores huérfanos de fases anteriores: se mantuvieron detenidos, sin eliminación.

### K. Decisiones técnicas y cambios propuestos

Ver `docs/DECISIONS.md`. Se decidió modelar stock en la variante sin lógica, archivado lógico, slug/SKU por tenant y storage intercambiable por proveedor externo. Propuesto: mover imágenes a object storage cuando se publique la tienda y añadir auditoría de cambios de catálogo.

### L. Pendientes para la Fase 2B

Tienda pública con catálogo por tenant, fichas de producto con galería, selector de variantes y carrito. No se implementaron en esta fase.

### M. Estado de Git

Commit de Fase 2A con mensaje «Fase 2A: catalogo administrativo multi-tenant». `.env`, `node_modules`, `.next`, volúmenes e imágenes subidas quedan fuera del repositorio.
