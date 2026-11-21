# Decisiones técnicas

| # | Decisión | Motivo |
|---|---|---|
| 1 | Plantilla visual fija (sin drag & drop) | Alcance de 3A; el constructor de flujos es 3B |
| 2 | Una landing por producto y negocio | Simplifica el piloto; se documenta la futura multidimensional por campaña |
| 3 | Snapshots `LandingVersion` + punteros `draftVersionId`/`publishedVersionId` | Permite editar sin alterar lo publicado y mantener la versión anterior |
| 4 | Publicar cambia solo el puntero en transacción | Sin estados parciales |
| 5 | Guardar sobre versión publicada crea otro snapshot | Conserva la versión pública mientras se edita |
| 6 | Concurrencia optimista con `revision` | Evita sobrescribir cambios de otro usuario |
| 7 | FK `heroImageId` con `onDelete: Restrict` | Evita landings públicas rotas por borrar una imagen |
| 8 | Slug único por tenant | URLs estables y sin colisiones entre negocios |
| 9 | Contenido como texto validado (sin HTML/JS/CSS) | Seguridad; React escapea la salida |
| 10 | Preview privado con noindex/no-store | Evita indexación y caché de borradores |
| 11 | Sin endpoint JSON de borradores | Reduce superficie de fuga de contenido no publicado |
| 12 | OWNER publica; OPERATOR solo guarda | Permisos mínimos sin RBAC avanzado |
| 13 | Precios y variantes leídos del catálogo | No duplicar datos; precio siempre vigente |
| 14 | Mensaje de WhatsApp construido en servidor | Reutiliza reglas de la Fase 2B y revalida la landing |
| 15 | Sin pruebas automatizadas | Verificación manual/HTTP documentada |

## Cambios de requisitos

- La referencia oficial de Stitch mostraba datos de stock y despacho; se omitieron porque no existen datos confiables en esta fase.
- La vista previa se implementó como página autenticada (no como URL pública con token), por simplicidad y seguridad.

## Propuestas

- Varias landings por producto para campañas, con `campaign` en el modelo.
- Publicación programada y auditoría de quién publicó.
- Hero image con transformaciones/CDN.
- Al conectar el chatbot, usar el SKU del mensaje como contexto.
