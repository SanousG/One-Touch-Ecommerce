# Decisiones técnicas

| # | Decisión | Motivo |
|---|---|---|
| 1 | Next.js 16, Prisma 7, Better Auth, Docker standalone | Conservar el stack de Fase 1 |
| 2 | Catálogo en `src/lib/catalog/service.ts` con DTOs | Un único punto de autorización; nunca pasar entidades Prisma al cliente |
| 3 | Búsqueda por ID con `{ id, tenantId }` | Evita IDOR y no revela existencia de recursos ajenos (404) |
| 4 | `DECIMAL(12,2)` y precios como string en JSON | Precisión monetaria |
| 5 | Slug por tenant y SKU por tenant | Permite el mismo nombre en negocios distintos |
| 6 | Variante predeterminada al crear producto | Simplifica catálogos sin opciones; el inventario futuro apunta a variantes, no a productos |
| 7 | Campos de stock en la variante (sin lógica) | Evita una migración futura duplicada; no se exponen ni se modifican en 2A |
| 8 | Archivado lógico (`ARCHIVED`), sin borrado físico | Conserva historial para pedidos/flujos futuros |
| 9 | Categoría con `onDelete: SetNull` | Archivar/reorganizar no destruye productos |
| 10 | Imágenes en volumen Docker fuera de la imagen | Persisten tras `up -d --build`; preparado para migrar a S3/R2 cambiando solo el módulo de storage |
| 11 | Endpoint privado + endpoint público de imágenes | Separa administración de la futura tienda; el público filtra por producto activo y visible |
| 12 | Validación MIME + firma mágica + máximo 5 MB | Rechaza SVG/HTML y archivos disfrazados |
| 13 | `turbopackIgnore` en accesos a filesystem | Evita que se trace todo el proyecto en el standalone |
| 14 | Permisos simples OWNER/OPERATOR (solo archivar reservado) | Cubre la necesidad sin RBAC avanzado |
| 15 | Sin pruebas automatizadas | Validación manual/HTTP documentada en esta etapa |

## Cambios de requisitos / decisiones posteriores

- El stock se modeló en la variante desde ahora porque pedidos e inventario futuros se referirán a `variantId`.
- El editor visual y WhatsApp siguen fuera de alcance; sus secciones se muestran como no disponibles.
- La tienda pública no se implementa en 2A; se deja la superficie pública de imágenes con las reglas correctas.

## Pendiente para fases siguientes

Tienda pública, fichas, carrito (2B); inventario con movimientos/reservas; flujo visual y chatbot; pedidos.
