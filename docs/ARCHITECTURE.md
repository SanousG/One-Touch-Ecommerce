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

## Relación con fases futuras

Plantilla fija en 3A. La Fase 3B añadirá el editor visual de flujos; las landing seguirán siendo puntos de entrada al producto. El chatbot podrá usar la referencia del mensaje para identificar productos. Inventario y pedidos siguen pendientes.
