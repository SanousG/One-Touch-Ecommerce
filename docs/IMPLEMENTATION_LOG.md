# Historial de implementación

## Fases anteriores (resumen)

Fase 1: base multi-tenant y Better Auth. Fase 1.1: Docker. Fase 2A: catálogo administrativo. Fase 2B: tienda pública, fichas, carrito y WhatsApp. Sin frameworks de testing.

## Fase 3A — Landings de productos

### A. Resultado general y estado de implementación

**Completo.** Un negocio puede crear, editar, previsualizar y publicar una landing de producto sin afectar a otros negocios. La edición del borrador no modifica la página pública; los cambios se publican de forma explícita y transaccional. El cliente puede consultar el producto por WhatsApp desde la landing. No se implementó el editor visual de flujos ni ninguna funcionalidad de fases posteriores.

### B. Archivos creados, modificados y eliminados

**Creados**

- `prisma/migrations/20261121032613_landings/migration.sql`.
- `src/lib/landings/service.ts`, `src/lib/landings/http.ts`.
- `src/app/api/admin/landings/route.ts`
- `src/app/api/admin/landings/[id]/route.ts`
- `src/app/api/admin/landings/[id]/publish/route.ts`
- `src/app/api/store/[tenantSlug]/landing/[landingSlug]/whatsapp/route.ts`
- `src/app/dashboard/landings/page.tsx`
- `src/app/dashboard/landings/[id]/page.tsx`
- `src/app/dashboard/landings/[id]/preview/page.tsx`
- `src/app/tienda/[tenantSlug]/landing/[landingSlug]/page.tsx`
- `src/components/landings/landing-view.tsx`
- `src/components/landings/landing-whatsapp-button.tsx`
- `src/components/landings/landing-list.tsx`
- `src/components/landings/landing-editor.tsx`

**Modificados**

- `prisma/schema.prisma`: modelos `Landing` y `LandingVersion`, relaciones en `Tenant`, `Product` y `ProductImage`.
- `src/lib/catalog/service.ts`: `ConflictError` y bloqueo de borrado de imágenes referenciadas por landings.
- `src/lib/catalog/http.ts`: mapeo de 409.
- `src/lib/auth/permissions.ts`: `assertLandingManager`, `assertLandingPublisher`.
- `src/components/dashboard/sidebar.tsx`: enlace activo a `/dashboard/landings`.
- `src/components/ui/icon.tsx`: iconos `rocket`, `link`, `copy`.
- `next.config.ts`: cabeceras `no-store` y `noindex` para `/dashboard/:path*`.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, este archivo.

**Eliminados**: ninguno. No se borraron volúmenes ni datos. MCP de Stitch intacto.

### C. Modelo de datos y migraciones

`Landing`: `tenantId`, `productId`, `slug`, `draftVersionId`, `publishedVersionId`, `publishedAt`, `createdById`, `updatedById`, timestamps; únicos `(tenantId, slug)` y `(tenantId, productId)`.
`LandingVersion`: `tenantId`, `landingId`, `version`, `headline`, `summary`, `heroImageId`, `benefits` (Json), `faqs` (Json), `revision`, `createdById`; único `(landingId, version)`; `heroImageId` con `onDelete: Restrict`.

Migración `20261121032613_landings`: «4 migrations found», «Applying migration», «All migrations have been successfully applied». No se usó `db push` ni se reemplazaron migraciones.

### D. Funcionamiento del administrador de landings

`/dashboard/landings` lista producto, slug y estado (Sin publicar / Cambios sin publicar / Publicada), permite crear desde un producto real y copiar el enlace público. `/dashboard/landings/[id]` muestra el producto vinculado en solo lectura (precio y variantes del catálogo), el formulario de contenido y una vista previa en vivo con la misma plantilla pública.

### E. Sistema de borradores y versiones publicadas

Guardar borrador no toca la pública. Si el borrador editado es la versión publicada, se crea un nuevo snapshot. Publicar actualiza el puntero en transacción. `revision` + `expectedRevision` devuelven 409 ante ediciones concurrentes. En la validación real se generaron 3 versiones: v1 borrador inicial, v2 publicada y v3 borrador posterior; la pública siguió mostrando v2 hasta la republicación.

### F. Funcionamiento de la landing pública

Ruta `/tienda/[tenantSlug]/landing/[landingSlug]`. Sin login. 404 si no hay versión publicada, si el tenant/slug no coincide o si el producto no está `ACTIVE` y `storeVisible`. Muestra marca, portada, titular, descripción, precio vigente, beneficios, FAQ, WhatsApp y enlace a la tienda. Metadatos de título y descripción generados desde la versión publicada.

### G. Integración con productos, imágenes, precios y WhatsApp

Contenido vinculado al producto real; precio y variantes nunca se duplican. La fotografía principal se elige entre las imágenes del producto. Cambiar el precio del producto cambió el precio mostrado en la landing (77.77 en la comprobación). Una imagen referenciada no se puede eliminar (409). El botón de WhatsApp reutiliza el número del negocio y genera un mensaje con referencia de producto; sin teléfono aparece desactivado y la API responde 409.

### H. Seguridad, permisos y aislamiento multi-tenant

OWNER crea/edita/guarda/publica; OPERATOR crea/edita/guarda pero no publica (403 verificado). El usuario B no pudo listar, consultar, modificar ni publicar la landing de A (404), ni ver su preview. El borrador no se expone sin sesión (401) ni mediante endpoints JSON. Preview responde `no-store, private` y `noindex, nofollow`. No se permiten etiquetas `<`/`>` en el contenido.

### I. Diseños de Stitch utilizados y diferencias

Proyecto `projects/1619124812250481064`:

- Editor: `screens/e1f3cbf73ce04cfe9db20ad656cd1fa4`.
- Pública: `screens/7e9e9371db934b4ba3f468514a03675e`.

Se conservaron el editor de dos columnas con vista previa en vivo, la cabecera de acciones, las tarjetas de producto/contenido y la landing con hero, beneficios, FAQ y CTA final. Diferencias: plantilla fija (sin drag & drop), sin stock/despacho/garantías inventados, colores e Inter de la Fase 1, acento índigo y verde solo para WhatsApp, y datos reales del catálogo. No se copió HTML literal.

### J. Verificaciones ejecutadas y resultados reales

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores, 0 advertencias |
| `npm run typecheck` | ✅ sin errores |
| `npm run build` | ✅ 33 rutas, sin errores |
| `docker compose up -d --build` | ✅ migración aplicada, `app` healthy |
| Crear landing desde producto real | ✅ 201 |
| Sin publicar → URL pública | ✅ 404 |
| Vista previa privada con sesión | ✅ 200 con borrador y aviso |
| Vista previa sin sesión | ✅ 307 a `/login` |
| Guardar borrador | ✅ 200, revisión 2 |
| Pública sigue 404 tras guardar | ✅ |
| Publicar | ✅ 200, `isPublished=true` |
| Acceso público sin login | ✅ 200 con titular, beneficios, FAQ y WhatsApp |
| Editar borrador | ✅ pública mantiene versión anterior; preview muestra la nueva |
| Republicar | ✅ pública muestra el nuevo titular |
| Costo de WhatsApp desde landing | ✅ 200 con `wa.me` y referencia `BLR30K` |
| Cambio de precio del producto | ✅ landing mostró 77.77; restaurado |
| Ocultar producto | ✅ landing 404; restaurada 200 |
| Borrar imagen referenciada | ✅ 409 |
| Borrador sin sesión vía API | ✅ 401 |
| Cabeceras de preview | ✅ `no-store, private` y `noindex, nofollow` |
| Metadatos públicos | ✅ `<title>` con titular y negocio |
| Aislamiento B sobre A | ✅ listado vacío; GET/PATCH/publicar/preview → 404 |
| Permisos OWNER/OPERATOR | ✅ OPERATOR publica → 403; guarda borrador → 200 |
| Concurrencia optimista | ✅ revisión incorrecta → 409 |
| Unicidad landing por producto | ✅ segundo intento → 409 |
| Producto ajeno al crear landing | ✅ rechazado (LandingNotFoundError) |
| Logs de `app` | ✅ sin errores críticos |
| Persistencia tras rebuild | ✅ landing pública, versión publicada, borrador, imagen y 3 versiones conservados |

No se crearon pruebas automatizadas ni archivos temporales de test en el repositorio. La interacción visual completa en navegador no se ejecutó; se validó el HTML renderizado y los flujos HTTP, por lo que la comprobación visual se reporta como **pendiente**.

### K. Estado de Docker Compose

`app` y `db` Up (healthy), `migrate` Exited correctamente, `seed`/`migrate-dev` bajo perfil `tools`. Sin volúmenes borrados ni contenedores de otros proyectos modificados.

### L. Problemas encontrados y soluciones

1. El editor recibía `ProductDTO` administrativo y la vista compartida espera `StoreProductDTO`: se añadió una conversión explícita en el editor para no duplicar la vista.
2. Clase dinámica de Tailwind en la rejilla de beneficios: se sustituyó por `md:grid-cols-3` estática.
3. Las comprobaciones de permisos con OPERATOR se realizaron cambiando temporalmente el rol en BD y restaurándolo; no quedaron cambios de rol.
4. Consultas `psql` con identificadores camelCase requieren comillas que PowerShell intercepta; se verificó el estado usando columnas sin comillas y las APIs HTTP.

### M. Decisiones arquitectónicas y propuestas de mejora

Ver `docs/DECISIONS.md`. Plantilla fija, snapshots separados, FK restrictiva para imágenes, publicación transaccional y permisos mínimos. Propuesto: campañas múltiples por producto, publicación programada, auditoría y CDN de imágenes.

### N. Estado de Git

Commit de Fase 3A con mensaje «Fase 3A: landings de productos y publicacion». Sin frameworks de testing. `.env`, volúmenes e imágenes fuera del repositorio.

### O. Pendientes para la Fase 3B

Constructor visual de flujos con diagramas, nodos y conexiones; gestión de flujos por producto/landing; y su integración futura con el chatbot. No se implementaron aquí.
