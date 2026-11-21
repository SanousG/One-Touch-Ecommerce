# Arquitectura

## Entorno Docker

- `db`: PostgreSQL 16-alpine, red `one-touch-network`, hostname `db`, sin puerto publicado. Volumen `one-touch-ecommerce-pgdata-dev`.
- `migrate`: objetivo `migrator` del Dockerfile; `prisma migrate deploy` con `depends_on` healthy. `app` espera a `service_completed_successfully`.
- `app`: objetivo `runner`, Next.js standalone, usuario no root, `0.0.0.0:3000`. Volumen `one-touch-ecommerce-product-uploads` en `/app/storage` (variable `PRODUCT_UPLOAD_DIR`).
- `migrate-dev` y `seed`: servicios `tools` con ejecución manual.

## Catálogo (Fase 2A)

### Capas

1. **Páginas**: `/dashboard/products` y `/dashboard/products/[id]` son `force-dynamic` y usan `requireCatalogContext()`.
2. **Componentes cliente**: `products-view`, `product-editor`, `variant-manager`, `image-manager`. Solo interactúan con los endpoints; no contienen lógica de autorización.
3. **Servicio `src/lib/catalog/service.ts`**: `server-only`. Resuelve el contexto (negocio activo + rol), valida pertenencia y realiza todas las mutaciones. Ninguna consulta omite `tenantId`.
4. **API**: `/api/admin/products`, `/api/admin/categories` y subrecursos. Mapean errores a HTTP con `catalogErrorResponse`.
5. **Almacenamiento `src/lib/storage/product-images.ts`**: valida MIME + firma binaria, guarda con clave `tenant/product/uuid.ext` y resuelve rutas dentro del directorio base (sin path traversal).

### Modelo y relaciones

```
Tenant 1──N Category       (slug único por tenant)
Tenant 1──N Product        (slug único por tenant)
Tenant 1──N ProductVariant (SKU único por tenant)
Tenant 1──N ProductImage   (storageKey único)
Product 1──N ProductVariant / ProductImage
Product N──0..1 Category   (onDelete: SetNull)
```

Precios: `DECIMAL(12,2)`. Se serializan como cadena en JSON para no perder precisión.

### Aislamiento

- `getApiCatalogContext()` valida sesión en BD, resuelve el negocio activo y exige membresía; `resolveActor()` comprueba la relación exacta usuario/negocio.
- Toda búsqueda por ID usa `{ id, tenantId }`. Un ID ajeno produce 404 (no filtra existencia).
- Categorías, variantes, imágenes y archivos se validan contra el mismo `tenantId`.
- Operaciones multi-registro (crear producto + variante, portada, reordenar, borrar imagen) usan `$transaction`.
- Si falla la escritura en BD tras guardar el archivo, se elimina el archivo huérfano.
- La superficie pública de imágenes solo sirve productos `ACTIVE` + `storeVisible: true`; la administración usa endpoints privados con `Cache-Control: private, no-store`.

### Permisos iniciales (sin RBAC avanzado)

| Operación | OWNER | OPERATOR |
|---|---|---|
| Ver/crear/editar productos, variantes, categorías, imágenes | ✅ | ✅ |
| Cambiar visibilidad | ✅ | ✅ |
| Archivar / restaurar | ✅ | ❌ |

### Inventario y flujos futuros

`ProductVariant` ya incluye `stockPhysical` y `stockReserved` (valor 0, sin API ni UI en esta fase). El disponible se calcula como diferencia. El módulo de inventario podrá escribir estos campos sin duplicar productos ni variantes; los movimientos y reservas se modelarán aparte. Las secciones de flujo de venta, WhatsApp, inventario y ficha pública aparecen deshabilitadas o como “no disponible”.

## Seguridad previa

La inicialización de Prisma y Better Auth es diferida, las páginas con sesión son `force-dynamic`, `proxy.ts` hace la comprobación optimista y el DAL realiza la autorización real. Las cookies por defecto son `Secure`; `AUTH_COOKIES_SECURE=false` es solo para HTTP local.
