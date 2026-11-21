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

| 16 | `@xyflow/react` 13.0.2 | Compatible con React 19/Next 16; API estable con `useNodesState`/`useEdgesState` |
| 17 | JSON validado + DTOs compartidos | Evita JSON arbitrario y tipado duplicado entre editor y servidor |
| 18 | Snapshot de plantillas y flujos globales por versión | Editar una plantilla o un global no cambia lo publicado |
| 19 | Retorno de flujos globales por la arista de salida | Define siempre el punto de continuación sin estado global |
| 20 | Ciclos permitidos solo con `fallback` saliente | Evita bucles sin salida manteniendo el patrón del diseño |
| 21 | Simulador local con límite de pasos | Sin efectos comerciales ni bucles infinitos |

| 22 | Reutilizar `stockPhysical`/`stockReserved` | Evita duplicar inventario; disponible = físico − reservado |
| 23 | `FOR UPDATE` + validación global antes de reservar | Evita sobreventa y reservas parciales concurrentes |
| 24 | Función `next_order_number` por tenant | Numeración segura y concurrente sin tablas de secuencia por negocio |
| 25 | Idempotencia por `tenantId + idempotencyKey` | Un doble clic no crea dos pedidos |
| 26 | Estados de pago y preparación separados | Verificar, despachar, entregar y cobrar son acciones independientes |
| 27 | `advancePaid` = total cobrado acumulado | Constraint corregido a `advancePaid <= total` (migración correctiva) |
| 28 | Comprobantes en almacenamiento privado | Nunca URL pública; verificación manual del OWNER |
| 29 | Sin expiración automática de reservas | No inventar vencimientos ni procesos programados; política futura |

| 30 | Interfaz `WhatsAppProvider` + adaptadores | El núcleo no depende de Wasender; Meta se registra como futuro |
| 31 | WasenderAPI como primer proveedor | Sesiones ya habilitadas; sin Personal Access Token global |
| 32 | AES-256-GCM con formato versionado | Credenciales cifradas, nonce individual y rotación futura |
| 33 | Webhook con comparación directa del secreto | Contrato documentado de Wasender (no HMAC de Meta) |
| 34 | WebhookEvent durable y idempotente | Eventos persistentes antes de confirmar; sin reprocesos |
| 35 | Cola saliente en PostgreSQL + worker | Durabilidad y control de concurrencia sin tareas en memoria |
| 36 | Estado incierto en timeouts | Evita reenvíos ciegos que dupliquen mensajes |
| 37 | Una conversación por contacto/conexión | Reabrir en vez de duplicar al llegar un mensaje nuevo |
| 38 | Retorno de flujos globales por arista de salida | Define continuación sin estado global (Fase 3B) |

## Cambios de requisitos

- La referencia oficial de Stitch mostraba datos de stock y despacho; se omitieron porque no existen datos confiables en esta fase.
- La vista previa se implementó como página autenticada (no como URL pública con token), por simplicidad y seguridad.

## Propuestas

- Varias landings por producto para campañas, con `campaign` en el modelo.
- Publicación programada y auditoría de quién publicó.
- Hero image con transformaciones/CDN.
- Al conectar el chatbot, usar el SKU del mensaje como contexto.
